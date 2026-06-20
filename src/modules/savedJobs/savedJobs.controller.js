const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const { getRequestUserId } = require('../../common/utils/requestUser');
const savedJobsService = require('./savedJobs.service');

const listSavedJobs = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const rows = await savedJobsService.listSavedJobs(userId);
  return sendSuccess(res, rows, 'Saved jobs fetched successfully');
});

const saveJob = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const row = await savedJobsService.saveJob(userId, req.params.id);
  return sendSuccess(res, row, 'Job saved successfully', 201);
});

const unsaveJob = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const row = await savedJobsService.unsaveJob(userId, req.params.id);
  return sendSuccess(res, row, 'Job removed from saved jobs');
});

module.exports = { listSavedJobs, saveJob, unsaveJob };
