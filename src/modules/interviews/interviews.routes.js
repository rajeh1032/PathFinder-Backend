const express = require('express');

const {
  authenticate,
  authorize,
} = require('../../common/middlewares/auth.middleware');
const {
  validateBody,
  validateParams,
  validateQuery,
} = require('../../common/middlewares/validate.middleware');
const interviewsController = require('./interviews.controller');
const {
  answerInterviewQuestionSchema,
  finishInterviewSessionSchema,
  createInterviewSessionSchema,
  interviewHistoryQuerySchema,
  sessionQuestionParamSchema,
  updateInterviewSessionSchema,
  uuidParamSchema,
} = require('./interviews.schema');

const router = express.Router();

router.get('/career-paths', authenticate, interviewsController.listCareerPaths);
router.post(
  '/sessions',
  authenticate,
  validateBody(createInterviewSessionSchema),
  interviewsController.createInterviewSession,
);
router.get(
  '/sessions',
  authenticate,
  validateQuery(interviewHistoryQuerySchema),
  interviewsController.listInterviewSessions,
);
router.get(
  '/admin/sessions',
  authenticate,
  authorize('admin'),
  validateQuery(interviewHistoryQuerySchema),
  interviewsController.listAdminInterviewSessions,
);
router.get(
  '/sessions/:id',
  authenticate,
  validateParams(uuidParamSchema),
  interviewsController.getInterviewSession,
);
router.get(
  '/admin/sessions/:id',
  authenticate,
  authorize('admin'),
  validateParams(uuidParamSchema),
  interviewsController.getAdminInterviewSession,
);
router.get(
  '/sessions/:id/questions',
  authenticate,
  validateParams(uuidParamSchema),
  interviewsController.getInterviewSessionQuestions,
);
router.patch(
  '/sessions/:id',
  authenticate,
  validateParams(uuidParamSchema),
  validateBody(updateInterviewSessionSchema),
  interviewsController.updateInterviewSession,
);
router.patch(
  '/sessions/:id/questions/:questionId/answer',
  authenticate,
  validateParams(sessionQuestionParamSchema),
  validateBody(answerInterviewQuestionSchema),
  interviewsController.answerInterviewQuestion,
);
router.patch(
  '/sessions/:id/questions/:questionId/skip',
  authenticate,
  validateParams(sessionQuestionParamSchema),
  interviewsController.skipInterviewQuestion,
);
router.patch(
  '/sessions/:id/finish',
  authenticate,
  validateParams(uuidParamSchema),
  validateBody(finishInterviewSessionSchema),
  interviewsController.finishInterviewSession,
);
router.get(
  '/sessions/:id/result',
  authenticate,
  validateParams(uuidParamSchema),
  interviewsController.getInterviewSessionResult,
);
router.patch(
  '/sessions/:id/cancel',
  authenticate,
  validateParams(uuidParamSchema),
  interviewsController.cancelInterviewSession,
);
router.delete(
  '/admin/sessions/:id',
  authenticate,
  authorize('admin'),
  validateParams(uuidParamSchema),
  interviewsController.deleteAdminInterviewSession,
);

module.exports = router;
