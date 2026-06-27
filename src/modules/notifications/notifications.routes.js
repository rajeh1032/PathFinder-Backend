const express = require("express");

const { authenticate } = require("../../common/middlewares/auth.middleware");
const {
  validateBody,
  validateParams,
  validateQuery,
} = require("../../common/middlewares/validate.middleware");
const notificationsController = require("./notifications.controller");
const {
  uuidParamSchema,
  listNotificationsQuerySchema,
  updateSettingsSchema,
  registerDeviceSchema,
  unregisterDeviceSchema,
} = require("./notifications.schema");

const router = express.Router();

// All notification routes are user-scoped and require authentication.
router.use(authenticate);

// --- Notification settings (per-user toggles) ---
router.get("/settings", notificationsController.getSettings);

router.patch(
  "/settings",
  validateBody(updateSettingsSchema),
  notificationsController.updateSettings,
);

// --- Device tokens (push registration) ---
// Defined before the "/:id" routes so "devices" is not treated as an id.
router.post(
  "/devices",
  validateBody(registerDeviceSchema),
  notificationsController.registerDevice,
);

router.delete(
  "/devices",
  validateBody(unregisterDeviceSchema),
  notificationsController.unregisterDevice,
);

// --- Inbox ---
router.get("/unread-count", notificationsController.getUnreadCount);

router.patch("/read-all", notificationsController.markAllAsRead);

router.get(
  "/",
  validateQuery(listNotificationsQuerySchema),
  notificationsController.getNotifications,
);

router.patch(
  "/:id/read",
  validateParams(uuidParamSchema),
  notificationsController.markAsRead,
);

router.delete(
  "/:id",
  validateParams(uuidParamSchema),
  notificationsController.dismissNotification,
);

module.exports = router;
