const Joi = require('joi');

const deviceFields = {
  fcmToken: Joi.string().min(10).max(4096),
  platform: Joi.string().valid('android', 'ios', 'web'),
};

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
  targetCareer: Joi.string().required(),
  ...deviceFields,
}).and('fcmToken', 'platform');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  ...deviceFields,
}).and('fcmToken', 'platform');

const changePasswordSchema = Joi.object({
  password: Joi.string().min(8).required(),
  newPassword: Joi.string().min(8).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
};
