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

  return sendSuccess(
    res,
    result,
    'Profile experience created successfully',
    201,
  );
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

const getEducation = asyncHandler(async (req, res) => {
  const userId = req.user.userId; // Formed by Supabase Auth verification layer
  const educationHistory =
    await profilesService.getUserEducationHistory(userId);

  return sendSuccess(
    res,
    educationHistory,
    'Profile education fetched successfully',
  );
});

const createEducation = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const newEducation = await profilesService.addEducation(userId, req.body);

  return sendSuccess(
    res,
    newEducation,
    'Profile education created successfully',
    201,
  );
});

const updateEducation = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const educationId = req.params.id;
  const updateData = req.body;

  const result = await profilesService.updateEducation(
    userId,
    educationId,
    updateData,
  );

  return sendSuccess(res, result, 'Profile Education updated successfully');
});

const getAllTargetCareer = asyncHandler(async (req, res) => {
  const careerPaths = await profilesService.getAllTargetPaths();
  return sendSuccess(
    res,
    careerPaths,
    'successfully retreive careerPaths',
    200,
  );
});

module.exports = {
  createMyExperience,
  deleteMyExperience,
  getMyExperienceById,
  getMyExperiences,
  updateMyExperience,
  getEducation,
  createEducation,
  getAllTargetCareer,
  updateEducation,
};
