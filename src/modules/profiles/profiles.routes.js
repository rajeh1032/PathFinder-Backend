const express = require('express');

const { authenticate } = require('../../common/middlewares/auth.middleware');
const {
  validateBody,
  validateParams,
} = require('../../common/middlewares/validate.middleware');
const profilesController = require('./profiles.controller');
const {
  createExperienceSchema,
  experienceIdParamSchema,
  updateExperienceSchema,
} = require('./profiles.schema');

const router = express.Router();

router.get('/me/experiences', authenticate, profilesController.getMyExperiences);

router.post(
  '/me/experiences',
  authenticate,
  validateBody(createExperienceSchema),
  profilesController.createMyExperience,
);

router.get(
  '/me/experiences/:id',
  authenticate,
  validateParams(experienceIdParamSchema),
  profilesController.getMyExperienceById,
);

router.patch(
  '/me/experiences/:id',
  authenticate,
  validateParams(experienceIdParamSchema),
  validateBody(updateExperienceSchema),
  profilesController.updateMyExperience,
);

router.delete(
  '/me/experiences/:id',
  authenticate,
  validateParams(experienceIdParamSchema),
  profilesController.deleteMyExperience,
);

module.exports = router;
