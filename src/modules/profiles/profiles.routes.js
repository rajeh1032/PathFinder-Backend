const express = require('express');
const multer = require('multer');

const AppError = require('../../common/errors/AppError');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const {
  validateBody,
  validateParams,
} = require('../../common/middlewares/validate.middleware');
const profilesController = require('./profiles.controller');
const {
  AVATAR_MAX_FILE_SIZE,
  ALLOWED_AVATAR_MIME_TYPES,
} = require('./profiles.service');
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

// Multipart upload for the profile avatar. The optional image is sent in the
// `avatar` field; other profile fields travel as normal multipart text fields.
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: AVATAR_MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      return cb(new AppError('Only JPG, PNG, WEBP, or GIF images are allowed', 415));
    }

    return cb(null, true);
  },
});

const uploadAvatar = (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Profile image must be 5MB or smaller', 413));
      }

      return next(new AppError(error.message, 400));
    }

    return next(error);
  });
};

router.get('/me', authenticate, profilesController.getMyProfile);

router.patch(
  '/me',
  authenticate,
  uploadAvatar,
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
