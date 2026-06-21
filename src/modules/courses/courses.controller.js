const { sendPaginated, sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const coursesService = require('./courses.service');

const previewCourseImport = asyncHandler(async (req, res) => {
  const result = await coursesService.previewCourseImport({
    user: req.user,
    payload: req.body,
  });

  return sendSuccess(res, result, 'Course import preview generated successfully');
});

const confirmCourseImport = asyncHandler(async (req, res) => {
  const result = await coursesService.confirmCourseImport({
    user: req.user,
    payload: req.body,
  });

  const statusCode = result.alreadyImported ? 200 : 201;
  return sendSuccess(res, result, 'Course import confirmed successfully', statusCode);
});

const getRecommendedCourses = asyncHandler(async (req, res) => {
  const result = await coursesService.getRecommendedCourses({
    user: req.user,
    limit: req.query.limit,
  });

  return sendSuccess(res, result, 'Recommended courses fetched successfully');
});

const getCourses = asyncHandler(async (req, res) => {
  const result = await coursesService.getCourses({ user: req.user, query: req.query });
  return sendPaginated(res, { courses: result.courses }, result.pagination, 'Courses fetched successfully');
});

const getCourseById = asyncHandler(async (req, res) => {
  const course = await coursesService.getCourseById({ user: req.user, courseId: req.params.id });
  return sendSuccess(res, { course }, 'Course fetched successfully');
});

const getSavedCourses = asyncHandler(async (req, res) => {
  const result = await coursesService.getSavedCourses({ user: req.user, query: req.query });
  return sendPaginated(res, { courses: result.courses }, result.pagination, 'Saved courses fetched successfully');
});

const saveCourse = asyncHandler(async (req, res) => {
  const result = await coursesService.saveCourse({ user: req.user, courseId: req.params.id });
  return sendSuccess(res, result, result.alreadySaved ? 'Course was already saved' : 'Course saved successfully', result.alreadySaved ? 200 : 201);
});

const unsaveCourse = asyncHandler(async (req, res) => {
  const result = await coursesService.unsaveCourse({ user: req.user, courseId: req.params.id });
  return sendSuccess(res, result, 'Course unsaved successfully');
});

const getEnrollments = asyncHandler(async (req, res) => {
  const result = await coursesService.getEnrollments({ user: req.user, query: req.query });
  return sendPaginated(res, { courses: result.courses }, result.pagination, 'Course enrollments fetched successfully');
});

const enrollCourse = asyncHandler(async (req, res) => {
  const result = await coursesService.enrollCourse({ user: req.user, courseId: req.params.id });
  return sendSuccess(res, result, result.alreadyEnrolled ? 'Course enrollment already exists' : 'Course enrollment created successfully', result.alreadyEnrolled ? 200 : 201);
});

const updateEnrollment = asyncHandler(async (req, res) => {
  const result = await coursesService.updateEnrollment({ user: req.user, courseId: req.params.id, payload: req.body });
  return sendSuccess(res, result, 'Course enrollment updated successfully');
});

const updateCourse = asyncHandler(async (req, res) => {
  const result = await coursesService.updateCourse({
    user: req.user,
    courseId: req.params.id,
    payload: req.body,
  });

  return sendSuccess(res, result, 'Course updated successfully');
});

const deleteCourse = asyncHandler(async (req, res) => {
  const result = await coursesService.deleteCourse({
    user: req.user,
    courseId: req.params.id,
  });

  return sendSuccess(res, result, 'Course deleted successfully');
});

module.exports = {
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getSavedCourses,
  saveCourse,
  unsaveCourse,
  getEnrollments,
  enrollCourse,
  updateEnrollment,
  previewCourseImport,
  confirmCourseImport,
  getRecommendedCourses,
};
