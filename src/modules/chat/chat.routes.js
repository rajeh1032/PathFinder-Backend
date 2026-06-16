const express = require('express');
const {
  createSession,
  getSessions,
  sendMessage,
  getMessages,
} = require('./chat.controller');
 
const router = express.Router();
 
router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.post('/:sessionId', sendMessage);
router.get('/:sessionId/messages', getMessages);
 
module.exports = router;
