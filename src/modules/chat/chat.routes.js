const express = require('express');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const {
  createSession,
  getSessions,
  sendMessage,
  getMessages,
  deleteSession,
} = require('./chat.controller');
 
const router = express.Router();

router.use(authenticate);
 
router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.post('/:sessionId', sendMessage);
router.get('/:sessionId/messages', getMessages);
router.delete('/sessions/:sessionId', deleteSession);
 
module.exports = router;
