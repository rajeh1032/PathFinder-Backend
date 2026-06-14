const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  name: Joi.string().max(255).required(),
  university: Joi.string().max(255).required(),
  major: Joi.string().max(255).required(),
  location: Joi.string().max(255).required(),
  educationLevel: Joi.string().required(),
  experienceYear: Joi.string().required(),
  currentStatus: Joi.string().required(),
  targetCareer:Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});


module.exports = {
  registerSchema,
  loginSchema,
};
