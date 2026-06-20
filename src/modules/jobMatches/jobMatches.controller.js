const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const { getRequestUserId } = require('../../common/utils/requestUser');
const jobMatchesService = require('./jobMatches.service');

const generateMatches = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const matches = await jobMatchesService.generateMatches(userId, req.body);
  return sendSuccess(res, matches, 'Job matches generated successfully', 201);
});

const listMatches = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await jobMatchesService.listMatches(userId, req.query);
  return sendSuccess(res, result.matches, 'Job matches fetched successfully', 200, { pagination: result.pagination });
});

const getMatch = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const match = await jobMatchesService.getMatch(userId, req.params.id);
  return sendSuccess(res, match, 'Job match fetched successfully');
});

module.exports = { generateMatches, listMatches, getMatch };
