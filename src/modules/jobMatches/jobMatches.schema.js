const Joi = require('joi');
const uuidParamSchema = Joi.object({ id: Joi.string().uuid().required() });
const generateJobMatchesSchema = Joi.object({
  userId: Joi.string().uuid(),
  jobId: Joi.string().uuid(),
  keyword: Joi.string().trim().max(140),
  location: Joi.string().trim().max(120),
  category: Joi.string().trim().max(80),
  level: Joi.string().trim().max(80),
  includeManual: Joi.boolean().truthy('true').falsy('false').default(false),
  limit: Joi.number().integer().min(1).max(100).default(10),
  concurrency: Joi.number().integer().min(1).max(5).default(2),
});
const listJobMatchesQuerySchema = Joi.object({
  userId: Joi.string().uuid(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  minScore: Joi.number().integer().min(0).max(100).default(50),
  includeWeak: Joi.boolean().truthy('true').falsy('false').default(false),
  includeFallback: Joi.boolean().truthy('true').falsy('false').default(false),
  includeManual: Joi.boolean().truthy('true').falsy('false').default(false),
});
const listAdminJobMatchesQuerySchema = Joi.object({
  userId: Joi.string().uuid(),
  status: Joi.string().trim().max(40),
  generatedByType: Joi.string().valid('ai', 'system'),
  minScore: Joi.number().integer().min(0).max(100).default(0),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
module.exports = { uuidParamSchema, generateJobMatchesSchema, listJobMatchesQuerySchema, listAdminJobMatchesQuerySchema };
