const Joi = require("joi");

// Whitelisted, typed update body. At least one field is required; unknown keys
// are stripped by the validate middleware.
const updateSettingsSchema = Joi.object({
  app_name: Joi.string().trim().min(1).max(120),
  support_email: Joi.string().trim().email().max(255),
  default_language: Joi.string().trim().valid("en", "ar", "fr"),
  ai_provider: Joi.string().trim().valid("anthropic", "openai", "google"),
  ai_model: Joi.string().trim().min(1).max(120),
  max_tokens: Joi.number().integer().min(256).max(32768),
  temperature: Joi.number().min(0).max(2),
  maintenance_enabled: Joi.boolean(),
  maintenance_message: Joi.string().trim().allow("").max(2000),
}).min(1);

module.exports = {
  updateSettingsSchema,
};
