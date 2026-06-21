const AppError = require("../../common/errors/AppError");
const { buildPaginationMeta } = require("../../common/utils/pagination");
const aiLogsRepository = require("./aiLogs.repository");

// Shape returned in list rows. Mirrors ai_logs columns without heavy text.
const mapAiLog = (row) => ({
  id: row.id,
  user_id: row.user_id,
  feature: row.feature,
  model: row.model,
  tokens_used: row.tokens_used,
  latency_ms: row.latency_ms,
  cost: row.cost,
  status: row.status,
  error_message: row.error_message,
  created_at: row.created_at,
});

// Detail shape adds prompt/response and the raw payload metadata.
const mapAiLogDetail = (row) => ({
  ...mapAiLog(row),
  prompt: row.prompt,
  response: row.response,
  request_payload: row.request_payload || {},
  response_payload: row.response_payload || {},
});

const getAiLogs = async ({ query }) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const filters = {
    q: query.q,
    feature: query.feature,
    model: query.model,
    status: query.status,
    userId: query.userId,
    from: query.from,
    to: query.to,
  };

  const { rows, totalItems } = await aiLogsRepository.findAiLogsPage({
    page,
    limit,
    filters,
  });

  return {
    logs: rows.map(mapAiLog),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
};

const getAiLogById = async ({ logId }) => {
  const row = await aiLogsRepository.findAiLogById(logId);
  if (!row) {
    throw new AppError("AI log not found", 404);
  }

  return mapAiLogDetail(row);
};

const deleteAiLog = async ({ logId }) => {
  const existing = await aiLogsRepository.findAiLogById(logId);
  if (!existing) {
    throw new AppError("AI log not found", 404);
  }

  await aiLogsRepository.deleteAiLog(logId);
  return { id: logId };
};

const clearAiLogs = async () => {
  await aiLogsRepository.deleteAllAiLogs();
  return { cleared: true };
};

// Compute the four summary cards the frontend shows over a time window.
const getAiLogStats = async ({ query }) => {
  const days = query.days || 1;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const rows = await aiLogsRepository.findStatsRows(since.toISOString());

  let totalRequests = 0;
  let totalTokens = 0;
  let latencySum = 0;
  let latencyCount = 0;
  let failedCount = 0;

  rows.forEach((row) => {
    totalRequests += 1;
    totalTokens += Number(row.tokens_used) || 0;

    if (row.latency_ms !== null && row.latency_ms !== undefined) {
      latencySum += Number(row.latency_ms) || 0;
      latencyCount += 1;
    }

    if (row.status && row.status !== "success") {
      failedCount += 1;
    }
  });

  const avgLatencyMs =
    latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0;
  const errorRate =
    totalRequests > 0
      ? Number(((failedCount / totalRequests) * 100).toFixed(2))
      : 0;

  return {
    since: since.toISOString(),
    days,
    totalRequests,
    totalTokens,
    avgLatencyMs,
    errorRate,
    failedCount,
  };
};

module.exports = {
  getAiLogs,
  getAiLogById,
  deleteAiLog,
  clearAiLogs,
  getAiLogStats,
};
