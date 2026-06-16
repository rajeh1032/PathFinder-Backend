const { sendSuccess } = require('../../common/utils/apiResponse');
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

module.exports = {
  previewCourseImport,
  confirmCourseImport,
  getRecommendedCourses,
};
