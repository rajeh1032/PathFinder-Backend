const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const profilesService = require('./profiles.service');

const getMyProfile = asyncHandler(async (req, res) => {
  const result = await profilesService.getMyProfile(req.user);

  return sendSuccess(res, result, 'Profile fetched successfully');
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const result = await profilesService.updateMyProfile({
    user: req.user,
    body: req.body,
    file: req.file,
  });

  return sendSuccess(res, result, 'Profile updated successfully');
});

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

const getEducationById = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const education = await profilesService.getEducationById(
    userId,
    req.params.id,
  );

  return sendSuccess(res, education, 'Profile education fetched successfully');
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

const deleteEducation = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await profilesService.removeEducation(userId, req.params.id);

  return sendSuccess(res, result, 'Profile education deleted successfully');
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
  getMyProfile,
  updateMyProfile,
  createMyExperience,
  deleteMyExperience,
  getMyExperienceById,
  getMyExperiences,
  updateMyExperience,
  getEducation,
  getEducationById,
  createEducation,
  getAllTargetCareer,
  updateEducation,
  deleteEducation,
};
