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
  createEducationSchema,
  updateEducationSchema,
} = require('./profiles.schema');

const router = express.Router();

router.get(
  '/me/experiences',
  authenticate,
  profilesController.getMyExperiences,
);

router.get('/me/education', authenticate, profilesController.getEducation);

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

router.post(
  '/me/education',
  validateBody(createEducationSchema),
  authenticate,
  profilesController.createEducation,
);

router.patch(
  '/me/education/:id',
  validateBody(updateEducationSchema),
  authenticate,
  profilesController.updateEducation,
);

router.get('/me/careerPahts', profilesController.getAllTargetCareer);
module.exports = router;
