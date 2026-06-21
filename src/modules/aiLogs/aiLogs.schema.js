const Joi = require("joi");

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const aiLogsQuerySchema = Joi.object({
  ...paginationSchema,
  q: Joi.string().trim().min(1).max(200),
  feature: Joi.string().trim().min(1).max(120),
  model: Joi.string().trim().min(1).max(120),
  // ai_logs.status is stored as success/failed.
  status: Joi.string().valid("success", "failed"),
  userId: Joi.string().uuid(),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});

const aiLogStatsQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(90).default(1),
});

module.exports = {
  uuidParamSchema,
  aiLogsQuerySchema,
  aiLogStatsQuerySchema,
};
