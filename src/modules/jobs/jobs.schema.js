const Joi = require('joi');

const uuidParamSchema = Joi.object({ id: Joi.string().uuid().required() });

const listJobsQuerySchema = Joi.object({
  userId: Joi.string().uuid(),
  keyword: Joi.string().trim().max(140),
  location: Joi.string().trim().max(120),
  category: Joi.string().trim().max(80),
  level: Joi.string().trim().max(80),
  status: Joi.string().valid('draft', 'published', 'archived'),
  remote: Joi.boolean().truthy('true').falsy('false'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  minScore: Joi.number().integer().min(0).max(100).default(50),
  includeWeak: Joi.boolean().truthy('true').falsy('false').default(false),
  includeFallback: Joi.boolean().truthy('true').falsy('false').default(false),
});

const syncJobsSchema = Joi.object({
  userId: Joi.string().uuid(),
  search: Joi.string().trim().max(160),
  location: Joi.string().trim().max(120),
  maxItems: Joi.number().integer().min(1).max(20),
  maxRunCostUsd: Joi.number().min(0.01).max(1),
  allowFallback: Joi.boolean().truthy('true').falsy('false').default(false),
  input: Joi.object().unknown(true),
});

module.exports = { uuidParamSchema, listJobsQuerySchema, syncJobsSchema };
