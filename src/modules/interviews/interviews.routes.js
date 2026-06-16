const express = require('express');

const { validateBody } = require('../../common/middlewares/validate.middleware');
const interviewsController = require('./interviews.controller');
const { createInterviewSessionSchema } = require('./interviews.schema');

const router = express.Router();

router.get('/career-paths', interviewsController.listCareerPaths);
router.post(
  '/sessions',
  validateBody(createInterviewSessionSchema),
  interviewsController.createInterviewSession,
);

module.exports = router;
