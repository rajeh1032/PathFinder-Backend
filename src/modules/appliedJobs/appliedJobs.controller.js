const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const { getRequestUserId } = require('../../common/utils/requestUser');
const appliedJobsService = require('./appliedJobs.service');

const listAppliedJobs = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const rows = await appliedJobsService.listAppliedJobs(userId);
  return sendSuccess(res, rows, 'Applied jobs fetched successfully');
});

const applyToJob = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const row = await appliedJobsService.applyToJob(userId, req.params.id, req.body);
  return sendSuccess(res, row, 'Applied to job successfully', 201);
});

const updateAppliedJobStatus = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const row = await appliedJobsService.updateStatus(userId, req.params.id, req.body);
  return sendSuccess(res, row, 'Applied job updated successfully');
});

module.exports = { listAppliedJobs, applyToJob, updateAppliedJobStatus };
