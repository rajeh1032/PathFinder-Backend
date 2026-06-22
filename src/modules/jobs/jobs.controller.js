const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const { getRequestUserId } = require('../../common/utils/requestUser');
const jobsService = require('./jobs.service');

const listJobs = asyncHandler(async (req, res) => {
  const result = await jobsService.listJobs(req.query);
  return sendSuccess(res, result.jobs, 'Jobs fetched successfully', 200, { pagination: result.pagination });
});

const listMatchedJobs = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await jobsService.listMatchedJobs({ userId, ...req.query });
  return sendSuccess(res, result.jobs, 'Matched jobs fetched successfully', 200, {
    pagination: result.pagination,
    sync: result.sync,
  });
});

const getJobById = asyncHandler(async (req, res) => {
  const job = await jobsService.getJobById(req.params.id);
  return sendSuccess(res, job, 'Job fetched successfully');
});

const syncJobs = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req, { required: false });
  const result = await jobsService.syncJobsFromApify({ userId, ...req.body });
  return sendSuccess(res, result, 'Jobs synced successfully', 201);
});

module.exports = { listJobs, listMatchedJobs, getJobById, syncJobs };
