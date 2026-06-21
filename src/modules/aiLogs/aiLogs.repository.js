const AppError = require("../../common/errors/AppError");
const { supabase, isConfigured } = require("../../config/supabase");

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError("Supabase is not configured", 500);
  }

  return supabase;
};

const handleSupabaseError = (error, message, statusCode = 500) => {
  if (error) {
    throw new AppError(message, statusCode, {
      code: error.code,
      hint: error.hint,
    });
  }
};

// Columns returned in list responses. Heavy text columns (prompt, response,
// request_payload, response_payload) are intentionally excluded from lists.
const LIST_FIELDS = `
  id,
  user_id,
  feature,
  model,
  tokens_used,
  latency_ms,
  cost,
  status,
  error_message,
  created_at
`;

const DETAIL_FIELDS = `
  id,
  user_id,
  feature,
  model,
  prompt,
  response,
  tokens_used,
  latency_ms,
  cost,
  status,
  error_message,
  request_payload,
  response_payload,
  created_at
`;

const findAiLogsPage = async ({ page, limit, filters }) => {
  const client = ensureSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client.from("ai_logs").select(LIST_FIELDS, { count: "exact" });

  if (filters.q) {
    query = query.or(`feature.ilike.%${filters.q}%,model.ilike.%${filters.q}%`);
  }
  if (filters.feature) query = query.ilike("feature", filters.feature);
  if (filters.model) query = query.ilike("model", filters.model);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to);

  handleSupabaseError(error, "Failed to fetch AI logs");
  return { rows: data || [], totalItems: count || 0 };
};

const findAiLogById = async (logId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("ai_logs")
    .select(DETAIL_FIELDS)
    .eq("id", logId)
    .maybeSingle();

  handleSupabaseError(error, "Failed to fetch AI log");
  return data;
};

const deleteAiLog = async (logId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("ai_logs")
    .delete()
    .eq("id", logId)
    .select("id")
    .maybeSingle();

  handleSupabaseError(error, "Failed to delete AI log");
  return data;
};

// Bulk delete. Without a filter Supabase rejects an unbounded delete, so we
// guard with a never-null id condition to delete every row.
const deleteAllAiLogs = async () => {
  const client = ensureSupabase();
  const { error } = await client.from("ai_logs").delete().not("id", "is", null);

  handleSupabaseError(error, "Failed to clear AI logs");
  return true;
};

// Minimal columns for a time window, used to compute the dashboard-style stats.
const findStatsRows = async (sinceIso) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("ai_logs")
    .select("tokens_used, latency_ms, status, created_at")
    .gte("created_at", sinceIso);

  handleSupabaseError(error, "Failed to read AI log stats");
  return data || [];
};

module.exports = {
  findAiLogsPage,
  findAiLogById,
  deleteAiLog,
  deleteAllAiLogs,
  findStatsRows,
};
