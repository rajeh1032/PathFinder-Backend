const {
  sendPaginated,
  sendSuccess,
} = require("../../common/utils/apiResponse");
const asyncHandler = require("../../common/utils/asyncHandler");
const aiLogsService = require("./aiLogs.service");

const getAiLogs = asyncHandler(async (req, res) => {
  const result = await aiLogsService.getAiLogs({ query: req.query });

  return sendPaginated(
    res,
    { logs: result.logs },
    result.pagination,
    "AI logs fetched successfully",
  );
});

const getAiLogStats = asyncHandler(async (req, res) => {
  const stats = await aiLogsService.getAiLogStats({ query: req.query });

  return sendSuccess(res, { stats }, "AI log stats fetched successfully");
});

const getAiLogById = asyncHandler(async (req, res) => {
  const log = await aiLogsService.getAiLogById({ logId: req.params.id });

  return sendSuccess(res, { log }, "AI log fetched successfully");
});

const deleteAiLog = asyncHandler(async (req, res) => {
  const result = await aiLogsService.deleteAiLog({ logId: req.params.id });

  return sendSuccess(res, result, "AI log deleted successfully");
});

const clearAiLogs = asyncHandler(async (req, res) => {
  const result = await aiLogsService.clearAiLogs();

  return sendSuccess(res, result, "AI logs cleared successfully");
});

module.exports = {
  getAiLogs,
  getAiLogStats,
  getAiLogById,
  deleteAiLog,
  clearAiLogs,
};
