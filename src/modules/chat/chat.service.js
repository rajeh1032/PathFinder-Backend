const AppError = require('../../common/errors/AppError');
const { config: geminiConfig } = require('../../config/gemini');
const { supabase, isConfigured } = require('../../config/supabase');
const { getRagContextForFeature } = require('../rag/rag.service');
const geminiService = require('../ai/gemini.service');

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError('Supabase is not configured', 500);
  }

  return supabase;
};

const throwDatabaseError = (error, fallbackMessage = 'Database error') => {
  if (error.code === '22P02') {
    throw new AppError('Invalid UUID value', 400, {
      reason: error.message,
      code: error.code,
    });
  }

  if (error.code === '23503') {
    throw new AppError('Referenced user or session was not found', 404, {
      reason: error.message,
      code: error.code,
    });
  }

  throw new AppError(fallbackMessage, 500, {
    reason: error.message,
    code: error.code,
  });
};

async function assertUserExists(userId) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throwDatabaseError(error, 'Failed to validate user');
  }

  if (!data) {
    throw new AppError('User not found', 404);
  }
}

async function getUserCV(userId) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cvs')
    .select(`
      parsed_text,
      original_name,
      cv_analyses (
        score,
        summary,
        strengths,
        weaknesses,
        suggestions,
        detected_skills,
        extracted
      )
    `)
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throwDatabaseError(error, 'Failed to fetch user CV');
  }

  if (!data) return null;

  const analysis = Array.isArray(data.cv_analyses)
    ? data.cv_analyses[0]
    : data.cv_analyses;

  return {
    extracted_text: data.parsed_text,
    analyzed_role: analysis?.extracted?.target_role || null,
    score: analysis?.score ?? null,
    analysis_result: analysis || null,
    original_name: data.original_name,
  };
}

async function createChatSession({ userId, title }) {
  const client = ensureSupabase();
  await assertUserExists(userId);
  // 1. Archive any previous active sessions for this user so only the new one is active
  const { error: archiveError } = await client
    .from('chat_sessions')
    .update({ status: 'archived' })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (archiveError) {
    throwDatabaseError(archiveError, 'Failed to archive previous chat sessions');
  }

  // 2. Create the new active session
  const { data, error } = await client
    .from('chat_sessions')
    .insert({
      user_id: userId,
      title: title?.trim() || 'New chat',
      status: 'active',
    })
    .select('id, user_id, title, status, created_at, updated_at')
    .single();

  if (error) {
    throwDatabaseError(error, 'Failed to create chat session');
  }

  return data;
}

async function fetchUserSessions(userId) {
  const client = ensureSupabase();
  await assertUserExists(userId);

  const { data, error } = await client
    .from('chat_sessions')
    .select('id, user_id, title, status, created_at, updated_at')
    .eq('user_id', userId)
    .neq('status', 'deleted')
    .order('updated_at', { ascending: false });

  if (error) {
    throwDatabaseError(error, 'Failed to fetch chat sessions');
  }

  return data;
}

async function getSessionHistory(sessionId) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('chat_messages')
    .select('sender, message')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) {
    throwDatabaseError(error, 'Failed to fetch session history');
  }

  if (!data) return [];
  return data;
}

async function saveMessage({ sessionId, sender, message, tokens }) {
  const client = ensureSupabase();
  const { error } = await client.from('chat_messages').insert({
    session_id: sessionId,
    sender,
    message,
    tokens: tokens ?? 0,
  });

  if (error) {
    throwDatabaseError(error, 'Failed to save chat message');
  }
}

async function validateSession(sessionId, userId) {
  const client = ensureSupabase();
  console.log('Validating session:', { sessionId, userId });
  const { data, error } = await client
    .from('chat_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .neq('status', 'deleted')
    .maybeSingle();

  console.log('Session data:', data, 'Error:', error);

  if (error) {
    throwDatabaseError(error, 'Failed to validate chat session');
  }

  if (!data) return false;
  return true;
}

async function updateSessionTimestamp(sessionId) {
  const client = ensureSupabase();
  const { error } = await client
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    throwDatabaseError(error, 'Failed to update chat session');
  }
}

async function fetchMessages(sessionId) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('chat_messages')
    .select('id, sender, message, tokens, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    throwDatabaseError(error, 'Failed to fetch chat messages');
  }

  return data;
}

function buildSystemPrompt(cv, ragContext = '') {
  if (!cv) {
    return `You are a strict AI career mentor.
You can ONLY answer questions related to the user's CV and career.
The user has not uploaded a CV yet.
Politely tell them to upload their CV first before you can help them.
Refuse to answer any other topic.`;
  }

  return `You are a strict AI career mentor for PathFinder AI app.

## YOUR RULES (NEVER BREAK THEM):
1. You ONLY answer questions about the user's CV, career, skills, job roles, and professional development.
2. If the user asks about anything else, politely refuse and redirect them to CV-related topics.
3. Always base your answers on the user's actual CV data provided below.
4. Be concise, professional, and encouraging.
5. Answer in the user's language (Arabic or English).

## USER'S CV DATA:
- **Target Role:** ${cv.analyzed_role ?? 'Not specified'}
- **CV Score:** ${cv.score ?? 'N/A'} / 100
- **CV Content:**
${cv.extracted_text ?? 'No content extracted'}

## CV ANALYSIS RESULT:
${cv.analysis_result ? JSON.stringify(cv.analysis_result, null, 2) : 'No analysis available'}

${ragContext ? `## ADDITIONAL KNOWLEDGE BASE:\n${ragContext}` : ''}

## RESPONSE FORMAT:
- sender: "assistant" for all your responses
- Keep answers concise and actionable
- Use bullet points for lists
- End with one focused follow-up question when needed`;
}

async function sendToGemini({ cv, history, message, ragContext }, retries = 3) {
  const contents = [
    ...(history || []).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.message }],
    })),
    {
      role: 'user',
      parts: [{ text: message }],
    },
  ];

  try {
    const result = await geminiService.generateContent({
      model: geminiConfig.model,
      systemInstruction: buildSystemPrompt(cv, ragContext),
      contents,
    });

    return {
      text: result.text,
      usage: result.usage || result.usageMetadata || null,
    };
  } catch (err) {
    const status = err && (err.status || err.statusCode || err.code);
    if ((status === 429 || status === '429') && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return sendToGemini({ cv, history, message, ragContext }, retries - 1);
    }
    throw err;
  }
}

async function softDeleteSession(sessionId) {
  const client = ensureSupabase();
  const { error } = await client
    .from('chat_sessions')
    .update({ status: 'deleted' })
    .eq('id', sessionId);

  if (error) {
    throwDatabaseError(error, 'Failed to delete chat session');
  }
}
module.exports = {
  createChatSession,
  fetchUserSessions,
  getUserCV,
  getSessionHistory,
  getRagContextForFeature,
  saveMessage,
  validateSession,
  updateSessionTimestamp,
  fetchMessages,
  buildSystemPrompt,
  sendToGemini,
  softDeleteSession,
};
