const {
  sendPaginated,
  sendSuccess,
} = require("../../common/utils/apiResponse");
const asyncHandler = require("../../common/utils/asyncHandler");
const skillsService = require("./skills.service");

const getSkills = asyncHandler(async (req, res) => {
  const result = await skillsService.getSkills({
    user: req.user,
    query: req.query,
  });

  return sendPaginated(
    res,
    { skills: result.skills },
    result.pagination,
    "Skills fetched successfully",
  );
});

const getSkillById = asyncHandler(async (req, res) => {
  const skill = await skillsService.getSkillById({
    user: req.user,
    skillId: req.params.id,
  });

  return sendSuccess(res, { skill }, "Skill fetched successfully");
});

const createSkill = asyncHandler(async (req, res) => {
  const result = await skillsService.createSkill({
    user: req.user,
    payload: req.body,
  });

  return sendSuccess(res, result, "Skill created successfully", 201);
});

const updateSkill = asyncHandler(async (req, res) => {
  const result = await skillsService.updateSkill({
    user: req.user,
    skillId: req.params.id,
    payload: req.body,
  });

  return sendSuccess(res, result, "Skill updated successfully");
});

const deleteSkill = asyncHandler(async (req, res) => {
  const result = await skillsService.deleteSkill({
    user: req.user,
    skillId: req.params.id,
  });

  return sendSuccess(res, result, "Skill deleted successfully");
});

module.exports = {
  getSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
};
