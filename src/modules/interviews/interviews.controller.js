const asyncHandler = require('../../common/utils/asyncHandler');
const interviewsService = require('./interviews.service');

const listCareerPaths = asyncHandler(async (req, res) => {
  const careerPaths = await interviewsService.listCareerPaths();

  return res.status(200).json({
    career_paths: careerPaths,
  });
});

const createInterviewSession = asyncHandler(async (req, res) => {
  const result = await interviewsService.createInterviewSession({
    userId: req.user?.id || req.body.user_id || null,
    payload: req.body,
  });

  return res.status(201).json(result);
});

module.exports = {
  listCareerPaths,
  createInterviewSession,
};
