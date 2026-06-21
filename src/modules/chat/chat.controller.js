const {
  createChatSession,
  fetchUserSessions,
  getUserCV,
  getSessionHistory,
  getRagContextForFeature,
  saveMessage,
  validateSession,
  updateSessionTimestamp,
  fetchMessages,
  sendToGemini,
  softDeleteSession,
} = require('./chat.service');

const handleError = (res, label, err) => {
  console.error(`${label} error:`, err);

  return res.status(err.statusCode || 500).json({
    error: err.isOperational ? err.message : 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
};

const getAuthenticatedUserId = (req) => {
  console.log('req.user:', req.user);
  return req.user?.userId || req.user?.id;
};

// POST /api/chat/sessions
async function createSession(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { title } = req.body;

    if (!userId)
      return res.status(401).json({ error: 'Authenticated user is required' });

    const session = await createChatSession({ userId, title });

    return res.status(201).json({ session });
  } catch (err) {
    return handleError(res, 'createSession', err);
  }
}

// GET /api/chat/sessions?userId=...
async function getSessions(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId)
      return res.status(401).json({ error: 'Authenticated user is required' });

    const sessions = await fetchUserSessions(userId);

    return res.status(200).json({ sessions });
  } catch (err) {
    return handleError(res, 'getSessions', err);
  }
}
 
// POST /api/chat/:sessionId 
async function sendMessage(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = getAuthenticatedUserId(req);
    const { message } = req.body;

    console.log('sendMessage start:', { sessionId, userId });
    // 1. Validation أولاً
    if (!message?.trim())
      return res.status(400).json({ error: 'Message is required' });
    if (!userId)
      return res.status(401).json({ error: 'Authenticated user is required' });

    // 2. Validate session
    const isValid = await validateSession(sessionId, userId);
    console.log('validateSession result:', isValid);
    if (!isValid)
      return res.status(404).json({ error: 'Session not found' });

    // 3. Fetch data
    const [cv, history, ragContext] = await Promise.all([
      getUserCV(userId),
      getSessionHistory(sessionId),
      getRagContextForFeature('chat'),
    ]);

    // 4. Save user message
    await saveMessage({
      sessionId,
      sender: 'user',
      message: message.trim(),
      tokens: Math.ceil(message.length / 4),
    });

    // 5. Send to Gemini (map 429 -> AppError for friendly message)
    const { text: aiResponse, usage } = await sendToGemini({
      cv,
      history,
      message: message.trim(),
      ragContext,
    }).catch((err) => {
      if (err.status === 429 || err.statusCode === 429) {
        const AppError = require('../../common/errors/AppError');
        throw new AppError('AI service is busy. Please try again in a moment.', 429);
      }
      throw err;
    });

    // 6. Save AI response + update session
    await Promise.all([
      saveMessage({
        sessionId,
        sender: 'assistant',
        message: aiResponse,
        tokens: usage?.candidatesTokenCount ?? 0,
      }),
      updateSessionTimestamp(sessionId),
    ]);

    // 7. Response في الآخر ✅
    return res.status(200).json({
      userMessage: {
        sender: 'user',
        message: message.trim(),
        created_at: new Date().toISOString(),
      },
      assistantMessage: {
        sender: 'assistant',
        message: aiResponse,
        created_at: new Date().toISOString(),
      },
      tokens: {
        prompt: usage?.promptTokenCount ?? 0,
        response: usage?.candidatesTokenCount ?? 0,
        total: usage?.totalTokenCount ?? 0,
      },
    });

  } catch (err) {
    return handleError(res, 'sendMessage', err);
  }
}
 
// \ GET /api/chat/:sessionId/messages \
async function getMessages(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = getAuthenticatedUserId(req);
 
    if (!userId)
      return res.status(401).json({ error: 'Authenticated user is required' });
 
    const isValid = await validateSession(sessionId, userId);
    if (!isValid)
      return res.status(404).json({ error: 'Session not found' });
 
    const messages = await fetchMessages(sessionId);
    return res.status(200).json({ messages });
  } catch (err) {
    return handleError(res, 'getMessages', err);
  }
}

// DELETE /api/chat/sessions/:sessionId
async function deleteSession(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = getAuthenticatedUserId(req);

    if (!userId)
      return res.status(401).json({ error: 'Authenticated user is required' });

    const isValid = await validateSession(sessionId, userId);
    if (!isValid)
      return res.status(404).json({ error: 'Session not found' });

    await softDeleteSession(sessionId);

    return res.status(200).json({ message: 'Session deleted successfully' });
  } catch (err) {
    return handleError(res, 'deleteSession', err);
  }
}

module.exports = {
  createSession,
  getSessions,
  sendMessage,
  getMessages,
  deleteSession,
};
 
