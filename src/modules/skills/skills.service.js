const AppError = require("../../common/errors/AppError");
const { buildPaginationMeta } = require("../../common/utils/pagination");
const skillsRepository = require("./skills.repository");

const mapSkill = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  level: row.level,
  aliases: Array.isArray(row.aliases) ? row.aliases : [],
  is_active: row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const getSkills = async ({ query }) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const filters = {
    q: query.q,
    category: query.category,
    level: query.level,
    isActive: query.isActive,
    sort: query.sort || "name",
  };

  const { rows, totalItems } = await skillsRepository.findSkillsPage({
    page,
    limit,
    filters,
  });

  return {
    skills: rows.map(mapSkill),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
};

const getSkillById = async ({ skillId }) => {
  const row = await skillsRepository.findSkillById(skillId);
  if (!row) {
    throw new AppError("Skill not found", 404);
  }

  const usage = await skillsRepository.countSkillUsage(skillId);
  return { ...mapSkill(row), ...usage };
};

const createSkill = async ({ user, payload }) => {
  const insert = {
    name: payload.name,
    category: payload.category,
    level: payload.level || null,
    aliases: payload.aliases || [],
    is_active: payload.is_active !== undefined ? payload.is_active : true,
    created_by: user?.id || null,
    updated_by: user?.id || null,
  };

  const row = await skillsRepository.createSkill(insert);
  return { skill: mapSkill(row) };
};

const updateSkill = async ({ user, skillId, payload }) => {
  const existing = await skillsRepository.findSkillById(skillId);
  if (!existing) {
    throw new AppError("Skill not found", 404);
  }

  const changes = { updated_by: user?.id || null };
  if (payload.name !== undefined) changes.name = payload.name;
  if (payload.category !== undefined) changes.category = payload.category;
  if (payload.level !== undefined) changes.level = payload.level || null;
  if (payload.aliases !== undefined) changes.aliases = payload.aliases;
  if (payload.is_active !== undefined) changes.is_active = payload.is_active;

  const row = await skillsRepository.updateSkill({ skillId, changes });
  if (!row) {
    throw new AppError("Skill not found", 404);
  }

  return { skill: mapSkill(row) };
};

const deleteSkill = async ({ skillId }) => {
  const existing = await skillsRepository.findSkillById(skillId);
  if (!existing) {
    throw new AppError("Skill not found", 404);
  }

  await skillsRepository.deleteSkill(skillId);
  return { id: skillId };
};

module.exports = {
  getSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
};
