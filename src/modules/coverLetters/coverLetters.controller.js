const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const { getRequestUserId } = require('../../common/utils/requestUser');
const coverLettersService = require('./coverLetters.service');

const generateCoverLetter = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const coverLetter = await coverLettersService.generateCoverLetter(userId, req.body);
  return sendSuccess(res, coverLetter, 'Cover letter generated successfully', 201);
});

const listCoverLetters = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await coverLettersService.listCoverLetters(userId, req.query);
  return sendSuccess(res, result.coverLetters, 'Cover letters fetched successfully', 200, { pagination: result.pagination });
});

const getCoverLetter = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const coverLetter = await coverLettersService.getCoverLetter(userId, req.params.id);
  return sendSuccess(res, coverLetter, 'Cover letter fetched successfully');
});

const updateCoverLetter = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const coverLetter = await coverLettersService.updateCoverLetter(userId, req.params.id, req.body);
  return sendSuccess(res, coverLetter, 'Cover letter updated successfully');
});

const deleteCoverLetter = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const coverLetter = await coverLettersService.deleteCoverLetter(userId, req.params.id);
  return sendSuccess(res, coverLetter, 'Cover letter archived successfully');
});

const listVersions = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const versions = await coverLettersService.listVersions(userId, req.params.id);
  return sendSuccess(res, versions, 'Cover letter versions fetched successfully');
});

const exportCoverLetter = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const coverLetter = await coverLettersService.exportCoverLetter(userId, req.params.id);
  return sendSuccess(res, coverLetter, 'Cover letter marked as exported');
});

module.exports = { generateCoverLetter, listCoverLetters, getCoverLetter, updateCoverLetter, deleteCoverLetter, listVersions, exportCoverLetter };
