const express = require('express');

const { authenticate } = require('../../common/middlewares/auth.middleware');
const { validateBody } = require('../../common/middlewares/validate.middleware');
const interviewsController = require('./interviews.controller');
const { createInterviewSessionSchema } = require('./interviews.schema');

const router = express.Router();

router.get('/career-paths', authenticate, interviewsController.listCareerPaths);
router.post(
  '/sessions',
  authenticate,
  validateBody(createInterviewSessionSchema),
  interviewsController.createInterviewSession,
);

module.exports = router;
