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


  // Schema for adding a new education record
const createEducationSchema = Joi.object({
  degree: Joi.string().min(2).required().messages({
    'string.empty': 'Degree is required',
  }),
  field_of_study: Joi.string().min(2).required().messages({
    'string.empty': 'Field of study is required',
  }),
  institution: Joi.string().min(2).required().messages({
    'string.empty': 'Institution/University is required',
  }),
  start_date: Joi.date().iso().required().messages({
    'date.format': 'Start date must be a valid ISO date',
  }),
  end_date: Joi.date().iso().allow(null, ''),
  grade: Joi.string().allow(null, ''),
  description: Joi.string().allow(null, ''),
});



// Schema for updating an existing record (fields are optional)
const updateEducationSchema = Joi.object({
  degree: Joi.string().min(2),
  field_of_study: Joi.string().min(2),
  institution: Joi.string().min(2),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().allow(null, ''),
  grade: Joi.string().allow(null, ''),
  description: Joi.string().allow(null, ''),
}).min(1); // Ensure at least one field is provided for update

// Schema for validating the UUID parameter
const educationParamSchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.guid': 'Invalid education ID format',
  }),
});

// Schema for updating the core profile record (all fields optional)
const updateProfileSchema = Joi.object({
  headline: optionalString(200),
  bio: optionalString(3000),
  location: optionalString(160),
  university: optionalString(200),
  major: optionalString(200),
  avatar_url: Joi.string().trim().uri().max(500).allow(null, ''),
  education_level_id: Joi.string().uuid().allow(null),
  current_status_id: Joi.string().uuid().allow(null),
  experience_year_id: Joi.string().uuid().allow(null),
  target_career_id: Joi.string().uuid().allow(null),
}).min(1);

module.exports = {
  createExperienceSchema,
  experienceIdParamSchema,
  updateExperienceSchema,
  createEducationSchema,
  updateEducationSchema,
  educationParamSchema,
  updateProfileSchema,
};
