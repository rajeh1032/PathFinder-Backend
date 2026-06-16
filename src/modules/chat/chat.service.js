const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabase } = require('../../config/supabase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getUserCV(userId) {
  const { data, error } = await supabase
    .from('cv_analyses')
    .select('extracted_text, analyzed_role, score, analysis_result')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

async function getSessionHistory(sessionId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('sender, message')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error || !data) return [];
  return data;
}

async function saveMessage({ sessionId, sender, message, tokens }) {
  const { error } = await supabase.from('chat_messages').insert({
    session_id: sessionId,
    sender,
    message,
    tokens: tokens ?? 0,
  });
  if (error) console.error('Save message error:', error);
}

async function validateSession(sessionId, userId) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;
  return true;
}

async function updateSessionTimestamp(sessionId) {
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

async function fetchMessages(sessionId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, sender, message, tokens, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
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
  getUserCV,
  getSessionHistory,
  saveMessage,
  validateSession,
  updateSessionTimestamp,
  fetchMessages,
  buildSystemPrompt,
  sendToGemini,
};
