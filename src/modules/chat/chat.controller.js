const {
  createChatSession,
  fetchUserSessions,
  getUserCV,
  getSessionHistory,
  saveMessage,
  validateSession,
  updateSessionTimestamp,
  fetchMessages,
  sendToGemini,
} = require('./chat.service');

const handleError = (res, label, err) => {
  console.error(`${label} error:`, err);

  return res.status(err.statusCode || 500).json({
    error: err.isOperational ? err.message : 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
};

// POST /api/chat/sessions
async function createSession(req, res) {
  try {
    const { userId, title } = req.body;

    if (!userId)
      return res.status(400).json({ error: 'userId is required' });

    const session = await createChatSession({ userId, title });

    return res.status(201).json({ session });
  } catch (err) {
    return handleError(res, 'createSession', err);
  }
}

// GET /api/chat/sessions?userId=...
async function getSessions(req, res) {
  try {
    const { userId } = req.query;

    if (!userId)
      return res.status(400).json({ error: 'userId is required' });

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
    const { message, userId } = req.body;
 
    // Validation
    if (!message?.trim())
      return res.status(400).json({ error: 'Message is required' });
    if (!userId)
      return res.status(400).json({ error: 'userId is required' });
 
    const isValid = await validateSession(sessionId, userId);
    if (!isValid)
      return res.status(404).json({ error: 'Session not found' });
 
    const [cv, history] = await Promise.all([
      getUserCV(userId),
      getSessionHistory(sessionId),
    ]);
 
    await saveMessage({
      sessionId,
      sender: 'user',
      message: message.trim(),
      tokens: Math.ceil(message.length / 4),
    });
 
    const { text: aiResponse, usage } = await sendToGemini({
      cv,
      history,
      message: message.trim(),
    });
 
   
    await Promise.all([
      saveMessage({
        sessionId,
        sender: 'assistant',
        message: aiResponse,
        tokens: usage?.candidatesTokenCount ?? 0,
      }),
      updateSessionTimestamp(sessionId),
    ]);
 
    return res.status(200).json({
      message: aiResponse,
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
    const { userId } = req.query;
 
    if (!userId)
      return res.status(400).json({ error: 'userId is required' });
 
    const isValid = await validateSession(sessionId, userId);
    if (!isValid)
      return res.status(404).json({ error: 'Session not found' });
 
    const messages = await fetchMessages(sessionId);
    return res.status(200).json({ messages });
  } catch (err) {
    return handleError(res, 'getMessages', err);
  }
}

module.exports = {
  createSession,
  getSessions,
  sendMessage,
  getMessages,
};
 
