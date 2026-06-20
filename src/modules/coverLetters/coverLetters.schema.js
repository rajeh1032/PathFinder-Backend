const Joi = require('joi');
const uuidParamSchema = Joi.object({ id: Joi.string().uuid().required() });
const generateCoverLetterSchema = Joi.object({
  userId: Joi.string().uuid(),
  jobId: Joi.string().uuid().required(),
  tone: Joi.string().valid('professional', 'enthusiastic', 'concise').default('professional'),
  keywords: Joi.array().items(Joi.string().trim().max(40)).default([]),
  companyInterest: Joi.string().trim().max(1000).allow(''),
  achievement: Joi.string().trim().max(1000).allow(''),
  language: Joi.string().valid('en', 'ar').default('en'),
});
const updateCoverLetterSchema = Joi.object({
  userId: Joi.string().uuid(),
  content: Joi.string().trim().min(10).required(),
  status: Joi.string().valid('draft', 'generated', 'edited', 'archived').default('edited'),
});
const listCoverLettersQuerySchema = Joi.object({
  userId: Joi.string().uuid(),
  status: Joi.string().valid('draft', 'generated', 'edited', 'archived'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
module.exports = { uuidParamSchema, generateCoverLetterSchema, updateCoverLetterSchema, listCoverLettersQuerySchema };
