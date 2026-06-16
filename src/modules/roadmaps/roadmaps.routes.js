const express = require('express');

const { authenticate } = require('../../common/middlewares/auth.middleware');
const {
  validateBody,
  validateParams,
} = require('../../common/middlewares/validate.middleware');
const roadmapsController = require('./roadmaps.controller');
const {
  generateRoadmapSchema,
  roadmapIdParamSchema,
  stepProgressParamSchema,
  updateStepProgressSchema,
} = require('./roadmaps.schema');

const router = express.Router();

router.post(
  '/generate',
  authenticate,
  validateBody(generateRoadmapSchema),
  roadmapsController.generateRoadmap,
);

router.get('/me', authenticate, roadmapsController.getMyRoadmap);

router.get(
  '/:id',
  authenticate,
  validateParams(roadmapIdParamSchema),
  roadmapsController.getRoadmapById,
);

router.patch(
  '/:roadmapId/steps/:stepId/progress',
  authenticate,
  validateParams(stepProgressParamSchema),
  validateBody(updateStepProgressSchema),
  roadmapsController.updateStepProgress,
);

module.exports = router;
