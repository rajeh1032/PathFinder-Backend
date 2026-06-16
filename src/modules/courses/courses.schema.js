const Joi = require('joi');

const optionalString = (max) => Joi.string().trim().max(max).allow(null, '');
const optionalUri = () => Joi.string().trim().uri().allow(null, '');

const manualMetadataSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255),
  description: Joi.string().trim().min(10).max(10000),
  category: optionalString(120),
  thumbnail_url: optionalUri(),
  learning_outcomes: Joi.array().items(Joi.string().trim().min(2).max(300)).max(20),
  language: Joi.string().trim().max(80),
  duration: optionalString(120),
  level: optionalString(80),
  is_free: Joi.boolean(),
});

const previewCourseImportSchema = Joi.object({
  url: Joi.string().trim().uri().required(),
  metadata: manualMetadataSchema.default({}),
});

const skillPreviewSchema = Joi.object({
  skill_id: Joi.string().uuid(),
  id: Joi.string().uuid(),
  name: Joi.string().trim().min(1).max(120).required(),
  category: Joi.string().trim().max(120).allow(null),
  confidence: Joi.number().min(0).max(1).allow(null),
  source: Joi.string()
    .valid('ai_analysis', 'admin_manual', 'imported_metadata')
    .default('ai_analysis'),
});

const analysisSchema = Joi.object({
  category: Joi.string().trim().max(120).allow(null),
  level: Joi.string().trim().max(80).allow(null),
  duration: Joi.string().trim().max(120).allow(null),
  language: Joi.string().trim().max(80).allow(null),
  skills_taught: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().min(1).max(120).required(),
        confidence: Joi.number().min(0).max(1).required(),
      }),
    )
    .default([]),
  prerequisites: Joi.array().items(Joi.string().trim().max(300)).default([]),
  learning_outcomes: Joi.array().items(Joi.string().trim().max(300)).default([]),
  summary: Joi.string().trim().max(5000).allow(null),
  confidence: Joi.number().min(0).max(1).allow(null),
}).unknown(false);

const confirmCourseImportSchema = Joi.object({
  provider: Joi.string().trim().min(2).max(120).required(),
  external_id: Joi.string().trim().max(120).allow(null),
  url: Joi.string().trim().uri().required(),
  metadata: manualMetadataSchema.required(),
  analysis: analysisSchema.required(),
  matched_skills: Joi.array().items(skillPreviewSchema).default([]),
  unmatched_skills: Joi.array().items(skillPreviewSchema).default([]),
  is_free: Joi.boolean(),
});

const recommendedCoursesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
});

module.exports = {
  previewCourseImportSchema,
  confirmCourseImportSchema,
  recommendedCoursesQuerySchema,
};
