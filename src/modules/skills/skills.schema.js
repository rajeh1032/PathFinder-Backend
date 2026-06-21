const Joi = require("joi");

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const skillsQuerySchema = Joi.object({
  ...paginationSchema,
  q: Joi.string().trim().min(1).max(120),
  category: Joi.string().trim().min(1).max(120),
  level: Joi.string().trim().min(1).max(80),
  isActive: Joi.boolean(),
  sort: Joi.string().valid("newest", "name").default("name"),
});

const aliasesSchema = Joi.array()
  .items(Joi.string().trim().min(1).max(120))
  .max(30);

const createSkillSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  category: Joi.string().trim().min(1).max(120).required(),
  level: Joi.string().trim().max(80).allow(null, ""),
  aliases: aliasesSchema.default([]),
  is_active: Joi.boolean().default(true),
});

const updateSkillSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120),
  category: Joi.string().trim().min(1).max(120),
  level: Joi.string().trim().max(80).allow(null, ""),
  aliases: aliasesSchema,
  is_active: Joi.boolean(),
}).min(1);

module.exports = {
  uuidParamSchema,
  skillsQuerySchema,
  createSkillSchema,
  updateSkillSchema,
};
