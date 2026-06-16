const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const roadmapsService = require('./roadmaps.service');

const generateRoadmap = asyncHandler(async (req, res) => {
  const result = await roadmapsService.generateRoadmap({
    user: req.user,
    forceRegenerate: req.body.forceRegenerate,
  });

  if (result.requiredAction) {
    return sendSuccess(res, result, result.message);
  }

  return sendSuccess(
    res,
    { roadmap: result.roadmap },
    result.reused
      ? 'Active roadmap fetched successfully'
      : 'Roadmap generated successfully',
    result.reused ? 200 : 201,
  );
});

const getMyRoadmap = asyncHandler(async (req, res) => {
  const result = await roadmapsService.getMyRoadmap(req.user);
  return sendSuccess(res, result, 'Roadmap fetched successfully');
});

const getRoadmapById = asyncHandler(async (req, res) => {
  const result = await roadmapsService.getRoadmapById({
    user: req.user,
    roadmapId: req.params.id,
  });

  return sendSuccess(res, result, 'Roadmap fetched successfully');
});

const updateStepProgress = asyncHandler(async (req, res) => {
  const result = await roadmapsService.updateStepProgress({
    user: req.user,
    roadmapId: req.params.roadmapId,
    stepId: req.params.stepId,
    progress: req.body.progress,
    isCompleted: req.body.is_completed,
  });

  return sendSuccess(res, result, 'Roadmap progress updated successfully');
});

module.exports = {
  generateRoadmap,
  getMyRoadmap,
  getRoadmapById,
  updateStepProgress,
};
