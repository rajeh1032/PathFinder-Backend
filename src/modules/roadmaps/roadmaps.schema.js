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
  isCompleted: Joi.boolean().optional(),
})
  .custom((value, helpers) => {
    if (
      typeof value.isCompleted === 'boolean' &&
      value.isCompleted !== (value.progress === 100)
    ) {
      return helpers.message({
        'any.custom':
          'isCompleted must be true only when progress is 100 and false otherwise',
      });
    }

    return value;
  })
  .required();

module.exports = {
  roadmapIdParamSchema,
  stepProgressParamSchema,
  generateRoadmapSchema,
  updateStepProgressSchema,
};
