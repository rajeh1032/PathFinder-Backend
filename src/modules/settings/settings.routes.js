const express = require("express");

const {
  authenticate,
  authorize,
} = require("../../common/middlewares/auth.middleware");
const {
  validateBody,
} = require("../../common/middlewares/validate.middleware");
const settingsController = require("./settings.controller");
const { updateSettingsSchema } = require("./settings.schema");

const router = express.Router();

// System settings are admin-controlled platform configuration.
router.get(
  "/",
  authenticate,
  authorize("admin"),
  settingsController.getSettings,
);

router.put(
  "/",
  authenticate,
  authorize("admin"),
  validateBody(updateSettingsSchema),
  settingsController.updateSettings,
);

module.exports = router;
