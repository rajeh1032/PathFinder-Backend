const { messaging, isConfigured } = require("../../config/firebase");
const logger = require("../../common/utils/logger");
const notificationsRepository = require("./notifications.repository");

// FCM data payload values must all be strings.
const stringifyData = (data = {}) => {
  const result = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "object") return;
    result[key] = String(value);
  });
  return result;
};

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

// Sends a multicast push to the given tokens and prunes any tokens that FCM
// reports as invalid. Returns the number of successful sends.
const sendToTokens = async ({ tokens, title, body, data }) => {
  if (!isConfigured || !messaging) {
    logger.warn("Push not sent: Firebase Admin is not configured");
    return { sent: 0 };
  }
  if (!Array.isArray(tokens) || tokens.length === 0) return { sent: 0 };

  const message = {
    tokens,
    notification: { title, body: body || "" },
    data: stringifyData(data),
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default" } } },
  };

  const response = await messaging.sendEachForMulticast(message);

  const invalidTokens = [];
  response.responses.forEach((res, index) => {
    if (!res.success) {
      logger.warn("FCM send failed for a token", {
        code: res.error?.code,
        message: res.error?.message,
      });
      if (INVALID_TOKEN_CODES.has(res.error?.code)) {
        invalidTokens.push(tokens[index]);
      }
    }
  });

  if (invalidTokens.length) {
    await notificationsRepository
      .deleteDeviceTokens(invalidTokens)
      .catch((error) =>
        logger.warn("Failed to prune invalid device tokens", {
          reason: error.message,
        }),
      );
  }

  return { sent: response.successCount };
};

module.exports = { sendToTokens };
