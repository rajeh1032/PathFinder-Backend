const {
  getUserCV,
  getSessionHistory,
  saveMessage,
  validateSession,
  updateSessionTimestamp,
  fetchMessages,
  sendToGemini,
} = require('./chat.service');
 
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
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: 'Internal server error' });
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
    console.error('getMessages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  sendMessage,
  getMessages,
};
 
