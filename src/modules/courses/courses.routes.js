const express = require('express');

const {
  authenticate,
  authorize,
} = require('../../common/middlewares/auth.middleware');
const {
  validateBody,
  validateQuery,
} = require('../../common/middlewares/validate.middleware');
const coursesController = require('./courses.controller');
const {
  confirmCourseImportSchema,
  previewCourseImportSchema,
  recommendedCoursesQuerySchema,
} = require('./courses.schema');

const router = express.Router();

router.post(
  '/import/preview',
  authenticate,
  authorize('admin'),
  validateBody(previewCourseImportSchema),
  coursesController.previewCourseImport,
);

router.post(
  '/import/confirm',
  authenticate,
  authorize('admin'),
  validateBody(confirmCourseImportSchema),
  coursesController.confirmCourseImport,
);

router.get(
  '/recommended',
  authenticate,
  validateQuery(recommendedCoursesQuerySchema),
  coursesController.getRecommendedCourses,
);

module.exports = router;
