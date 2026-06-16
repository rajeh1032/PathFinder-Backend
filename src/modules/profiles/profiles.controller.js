const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const profilesService = require('./profiles.service');

const getMyExperiences = asyncHandler(async (req, res) => {
  const result = await profilesService.getMyExperiences(req.user);

  return sendSuccess(res, result, 'Profile experiences fetched successfully');
});

const getMyExperienceById = asyncHandler(async (req, res) => {
  const result = await profilesService.getMyExperienceById({
    user: req.user,
    experienceId: req.params.id,
  });

  return sendSuccess(res, result, 'Profile experience fetched successfully');
});

const createMyExperience = asyncHandler(async (req, res) => {
  const result = await profilesService.createMyExperience({
    user: req.user,
    body: req.body,
  });

  return sendSuccess(res, result, 'Profile experience created successfully', 201);
});

const updateMyExperience = asyncHandler(async (req, res) => {
  const result = await profilesService.updateMyExperience({
    user: req.user,
    experienceId: req.params.id,
    body: req.body,
  });

  return sendSuccess(res, result, 'Profile experience updated successfully');
});

const deleteMyExperience = asyncHandler(async (req, res) => {
  const result = await profilesService.deleteMyExperience({
    user: req.user,
    experienceId: req.params.id,
  });

  return sendSuccess(res, result, 'Profile experience deleted successfully');
});

module.exports = {
  createMyExperience,
  deleteMyExperience,
  getMyExperienceById,
  getMyExperiences,
  updateMyExperience,
};
