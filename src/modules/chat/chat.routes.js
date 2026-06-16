const express = require('express');
const { sendMessage, getMessages } = require('./chat.controller');
 
const router = express.Router();
 
router.post('/:sessionId', sendMessage);
router.get('/:sessionId/messages', getMessages);
 
module.exports = router;
