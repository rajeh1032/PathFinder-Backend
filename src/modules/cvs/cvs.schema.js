const Joi = require('joi');

const analyzeCvSchema = Joi.object({});

const CV_STATUSES = ['uploaded', 'parsing', 'analyzing', 'completed', 'failed'];

const cvHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid(...CV_STATUSES)
    .optional(),
});

const cvIdParamSchema = Joi.object({
  cvId: Joi.string().uuid().required(),
});

const cvFileUrlQuerySchema = Joi.object({
  expiresIn: Joi.number().integer().min(60).max(3600).default(300),
});

module.exports = {
  analyzeCvSchema,
  cvHistoryQuerySchema,
  cvIdParamSchema,
  cvFileUrlQuerySchema,
};

// ===== Admin CV analyses (read-only) =====
const cvAnalysisIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

Object.assign(module.exports, {
  cvAnalysisIdParamSchema,
});
