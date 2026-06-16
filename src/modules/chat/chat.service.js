const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../../common/errors/AppError');
const { supabase, isConfigured } = require('../../config/supabase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
  const { data, error } = await client
    .from('chat_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

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

function buildSystemPrompt(cv) {
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
2. If the user asks about anything else (coding help, general knowledge, jokes, etc.), politely refuse and redirect them to CV-related topics.
3. Always base your answers on the user's actual CV data provided below.
4. Be concise, professional, and encouraging.

## USER'S CV DATA:
- **Target Role:** ${cv.analyzed_role ?? 'Not specified'}
- **CV Score:** ${cv.score ?? 'N/A'} / 100
- **CV Content:**
${cv.extracted_text ?? 'No content extracted'}

## CV ANALYSIS RESULT:
${cv.analysis_result ? JSON.stringify(cv.analysis_result, null, 2) : 'No analysis available'}

## EXAMPLES OF WHAT YOU CAN HELP WITH:
- "What skills am I missing for [role]?"
- "How can I improve my CV score?"
- "Am I ready for a senior role?"
- "What should I add to my CV?"
- "Prepare me for an interview for [role]"

## EXAMPLES OF WHAT YOU MUST REFUSE:
- "Write me a Python script"
- "What's the capital of France?"
- "Tell me a joke"
For these, say: "I can only help you with your CV and career goals. Try asking me about improving your CV or preparing for interviews."`;
}

async function sendToGemini({ cv, history, message }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('GEMINI_API_KEY is not configured', 500);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: buildSystemPrompt(cv),
  });

  const geminiHistory = history.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.message }],
  }));

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(message);

  return {
    text: result.response.text(),
    usage: result.response.usageMetadata,
  };
}

module.exports = {
  createChatSession,
  fetchUserSessions,
  getUserCV,
  getSessionHistory,
  saveMessage,
  validateSession,
  updateSessionTimestamp,
  fetchMessages,
  buildSystemPrompt,
  sendToGemini,
};
