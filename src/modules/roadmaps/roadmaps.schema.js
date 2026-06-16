const Joi = require('joi');

const roadmapIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const stepProgressParamSchema = Joi.object({
  roadmapId: Joi.string().uuid().required(),
  stepId: Joi.string().uuid().required(),
});

const generateRoadmapSchema = Joi.object({
  forceRegenerate: Joi.boolean().default(false),
});

const updateStepProgressSchema = Joi.object({
  progress: Joi.number().integer().min(0).max(100).required(),
  is_completed: Joi.boolean(),
})
  .min(1)
  .required();

module.exports = {
  roadmapIdParamSchema,
  stepProgressParamSchema,
  generateRoadmapSchema,
  updateStepProgressSchema,
};
