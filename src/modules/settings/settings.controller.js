const { sendSuccess } = require("../../common/utils/apiResponse");
const asyncHandler = require("../../common/utils/asyncHandler");
const settingsService = require("./settings.service");

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();

  return sendSuccess(res, { settings }, "Settings fetched successfully");
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings({
    payload: req.body,
    userId: req.user?.id || req.user?.userId || null,
  });

  return sendSuccess(res, { settings }, "Settings updated successfully");
});

module.exports = {
  getSettings,
  updateSettings,
};
