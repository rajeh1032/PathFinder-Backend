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

const getHistory = asyncHandler(async (req, res) => {
  const { items, pagination } = await cvsService.getHistory(req.user, req.query);

  return sendSuccess(
    res,
    { cvs: items },
    'CV history fetched successfully',
    200,
    { pagination },
  );
});

const getFileUrl = asyncHandler(async (req, res) => {
  const result = await cvsService.getFileUrl(
    req.user,
    req.params.cvId,
    req.query,
  );

  return sendSuccess(res, result, 'CV file URL created successfully');
});

module.exports = {
  analyzeCv,
  getLatestAnalysis,
  getStatus,
  getHistory,
  getFileUrl,
};

// ===== Admin CV analyses (read-only) =====
const listCvAnalyses = asyncHandler(async (req, res) => {
  const { items, pagination } = await cvsService.listCvAnalyses(req.query);

  return sendSuccess(
    res,
    { analyses: items },
    'CV analyses fetched successfully',
    200,
    { pagination },
  );
});

const getCvAnalysisById = asyncHandler(async (req, res) => {
  const analysis = await cvsService.getCvAnalysisById(req.params.id);

  return sendSuccess(res, { analysis }, 'CV analysis fetched successfully');
});

Object.assign(module.exports, {
  listCvAnalyses,
  getCvAnalysisById,
});
