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
  educationParamSchema,
  updateProfileSchema,
} = require('./profiles.schema');

const router = express.Router();

router.get('/me', authenticate, profilesController.getMyProfile);

router.patch(
  '/me',
  authenticate,
  validateBody(updateProfileSchema),
  profilesController.updateMyProfile,
);

router.get(
  '/me/experiences',
  authenticate,
  profilesController.getMyExperiences,
);

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

router.get('/me/education', authenticate, profilesController.getEducation);

router.post(
  '/me/education',
  authenticate,
  validateBody(createEducationSchema),
  profilesController.createEducation,
);

router.get(
  '/me/education/:id',
  authenticate,
  validateParams(educationParamSchema),
  profilesController.getEducationById,
);

router.patch(
  '/me/education/:id',
  authenticate,
  validateParams(educationParamSchema),
  validateBody(updateEducationSchema),
  profilesController.updateEducation,
);

router.delete(
  '/me/education/:id',
  authenticate,
  validateParams(educationParamSchema),
  profilesController.deleteEducation,
);

router.get('/me/careerPahts', profilesController.getAllTargetCareer);
module.exports = router;
