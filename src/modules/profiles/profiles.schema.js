const Joi = require('joi');

const optionalString = (max) => Joi.string().trim().max(max).allow(null, '');
const optionalDate = () => Joi.date().iso().allow(null).empty('');

const experienceIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const experienceSchemaBase = {
  job_title: Joi.string().trim().min(2).max(160),
  company_name: Joi.string().trim().min(2).max(160),
  employment_type: optionalString(80),
  location: optionalString(160),
  start_date: optionalDate(),
  end_date: optionalDate(),
  is_current: Joi.boolean(),
  description: optionalString(3000),
  skills: Joi.array().items(Joi.string().trim().min(1).max(120)).max(50),
  display_order: Joi.number().integer().min(0).max(1000),
};

const createExperienceSchema = Joi.object({
  ...experienceSchemaBase,
  job_title: experienceSchemaBase.job_title.required(),
  company_name: experienceSchemaBase.company_name.required(),
  is_current: experienceSchemaBase.is_current.default(false),
  skills: experienceSchemaBase.skills.default([]),
  display_order: experienceSchemaBase.display_order.default(0),
}).custom((value, helpers) => {
  if (value.is_current && value.end_date) {
    return helpers.error('any.invalid', {
      message: 'end_date must be empty when is_current is true',
    });
  }

  if (
    value.start_date &&
    value.end_date &&
    new Date(value.end_date) < new Date(value.start_date)
  ) {
    return helpers.error('any.invalid', {
      message: 'end_date must be greater than or equal to start_date',
    });
  }

  return value;
});

const updateExperienceSchema = Joi.object(experienceSchemaBase)
  .min(1)
  .custom((value, helpers) => {
    if (value.is_current && value.end_date) {
      return helpers.error('any.invalid', {
        message: 'end_date must be empty when is_current is true',
      });
    }

    if (
      value.start_date &&
      value.end_date &&
      new Date(value.end_date) < new Date(value.start_date)
    ) {
      return helpers.error('any.invalid', {
        message: 'end_date must be greater than or equal to start_date',
      });
    }

    return value;
  });

module.exports = {
  createExperienceSchema,
  experienceIdParamSchema,
  updateExperienceSchema,
};
