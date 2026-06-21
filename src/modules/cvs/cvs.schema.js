const Joi = require('joi');

const analyzeCvSchema = Joi.object({});

module.exports = {
  analyzeCvSchema,
};

// ===== Admin CV analyses (read-only) =====
const cvAnalysisIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

Object.assign(module.exports, {
  cvAnalysisIdParamSchema,
});
