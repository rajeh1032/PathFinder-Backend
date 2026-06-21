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
const coursesController = require('./courses.controller');
const {
  confirmCourseImportSchema,
  updateCourseSchema,
  previewCourseImportSchema,
  recommendedCoursesQuerySchema,
  coursesQuerySchema,
  paginatedCoursesQuerySchema,
  updateEnrollmentSchema,
  uuidParamSchema,
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

router.get(
  '/saved',
  authenticate,
  validateQuery(paginatedCoursesQuerySchema),
  coursesController.getSavedCourses,
);
router.get(
  '/enrollments',
  authenticate,
  validateQuery(paginatedCoursesQuerySchema),
  coursesController.getEnrollments,
);
router.get(
  '/',
  authenticate,
  validateQuery(coursesQuerySchema),
  coursesController.getCourses,
);
router.post(
  '/:id/save',
  authenticate,
  validateParams(uuidParamSchema),
  coursesController.saveCourse,
);
router.delete(
  '/:id/save',
  authenticate,
  validateParams(uuidParamSchema),
  coursesController.unsaveCourse,
);
router.post(
  '/:id/enroll',
  authenticate,
  validateParams(uuidParamSchema),
  coursesController.enrollCourse,
);
router.patch(
  '/:id/enrollment',
  authenticate,
  validateParams(uuidParamSchema),
  validateBody(updateEnrollmentSchema),
  coursesController.updateEnrollment,
);
router.get(
  '/:id',
  authenticate,
  validateParams(uuidParamSchema),
  coursesController.getCourseById,
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(uuidParamSchema),
  validateBody(updateCourseSchema),
  coursesController.updateCourse,
);
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(uuidParamSchema),
  coursesController.deleteCourse,
);

module.exports = router;
