const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const cvsService = require('./cvs.service');

const analyzeCv = asyncHandler(async (req, res) => {
  const result = await cvsService.analyzeCv({
    file: req.file,
    user: req.user,
  });

  return sendSuccess(res, result, 'CV analyzed successfully', 201);
});

const getLatestAnalysis = asyncHandler(async (req, res) => {
  const result = await cvsService.getLatestAnalysis(req.user);
  return sendSuccess(res, result, 'Latest CV analysis fetched successfully');
});

const getStatus = asyncHandler(async (req, res) => {
  const result = await cvsService.getStatus(req.user);
  return sendSuccess(res, result, 'CV status fetched successfully');
});

module.exports = {
  analyzeCv,
  getLatestAnalysis,
  getStatus,
};
