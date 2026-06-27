const admin = require("firebase-admin");
const logger = require("../common/utils/logger");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;
const useApplicationDefaultCredentials =
  process.env.FIREBASE_USE_ADC === "true";

const isConfigured = Boolean(
  projectId &&
    ((clientEmail && privateKey) || useApplicationDefaultCredentials),
);

let messaging = null;

if (isConfigured) {
  try {
    if (!admin.apps.length) {
      const credential =
        clientEmail && privateKey
          ? admin.credential.cert({ projectId, clientEmail, privateKey })
          : admin.credential.applicationDefault();

      admin.initializeApp({
        credential,
        projectId,
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
    "Firebase Admin not configured; set service-account variables or enable ADC",
  );
}

module.exports = { admin, messaging, isConfigured };
