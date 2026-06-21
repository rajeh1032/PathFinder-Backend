const express = require("express");

const {
  authenticate,
  authorize,
} = require("../../common/middlewares/auth.middleware");
const {
  validateParams,
  validateQuery,
} = require("../../common/middlewares/validate.middleware");
const aiLogsController = require("./aiLogs.controller");
const {
  uuidParamSchema,
  aiLogsQuerySchema,
  aiLogStatsQuerySchema,
} = require("./aiLogs.schema");

const router = express.Router();

// AI logs are an admin observability surface; lock the whole module to admins.
router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateQuery(aiLogsQuerySchema),
  aiLogsController.getAiLogs,
);

// Keep /stats before /:id so it is not captured by the id route.
router.get(
  "/stats",
  authenticate,
  authorize("admin"),
  validateQuery(aiLogStatsQuerySchema),
  aiLogsController.getAiLogStats,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateParams(uuidParamSchema),
  aiLogsController.getAiLogById,
);

router.delete(
  "/",
  authenticate,
  authorize("admin"),
  aiLogsController.clearAiLogs,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateParams(uuidParamSchema),
  aiLogsController.deleteAiLog,
);

module.exports = router;
