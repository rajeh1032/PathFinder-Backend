const admin = require("firebase-admin");
const logger = require("../common/utils/logger");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Private keys stored in .env keep their newlines escaped as "\n".
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

const isConfigured = Boolean(projectId && clientEmail && privateKey);

let messaging = null;

if (isConfigured) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    messaging = admin.messaging();
    logger.info("Firebase Admin initialized for push notifications");
  } catch (error) {
    messaging = null;
    logger.error("Failed to initialize Firebase Admin", {
      reason: error.message,
    });
  }
} else {
  logger.warn(
    "Firebase Admin not configured; push notifications are disabled",
  );
}

module.exports = { admin, messaging, isConfigured };
