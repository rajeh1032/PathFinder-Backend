const Joi = require("joi");

const NOTIFICATION_CATEGORIES = [
  "job",
  "interview",
  "insight",
  "learning",
  "document",
];

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const listNotificationsQuerySchema = Joi.object({
  ...paginationSchema,
  category: Joi.string().valid(...NOTIFICATION_CATEGORIES),
  isRead: Joi.boolean(),
  // unreadOnly is a convenience flag the app can use for the bell badge list.
  unreadOnly: Joi.boolean().default(false),
});

const updateSettingsSchema = Joi.object({
  push_enabled: Joi.boolean(),
  email_enabled: Joi.boolean(),
  job_alerts_enabled: Joi.boolean(),
  roadmap_reminders_enabled: Joi.boolean(),
  interview_reminders_enabled: Joi.boolean(),
  ai_tips_enabled: Joi.boolean(),
}).min(1);

const DEVICE_PLATFORMS = ["android", "ios", "web"];

const registerDeviceSchema = Joi.object({
  token: Joi.string().min(10).max(4096).required(),
  platform: Joi.string()
    .valid(...DEVICE_PLATFORMS)
    .required(),
}).required();

const unregisterDeviceSchema = Joi.object({
  token: Joi.string().min(10).max(4096).required(),
}).required();

module.exports = {
  NOTIFICATION_CATEGORIES,
  DEVICE_PLATFORMS,
  uuidParamSchema,
  listNotificationsQuerySchema,
  updateSettingsSchema,
  registerDeviceSchema,
  unregisterDeviceSchema,
};
