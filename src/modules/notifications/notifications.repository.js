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

const NOTIFICATION_FIELDS = `
  id,
  user_id,
  type,
  category,
  title,
  body,
  action_label,
  action_url,
  metadata,
  is_read,
  read_at,
  created_at
`;

const SETTINGS_FIELDS = `
  id,
  user_id,
  push_enabled,
  email_enabled,
  job_alerts_enabled,
  roadmap_reminders_enabled,
  interview_reminders_enabled,
  ai_tips_enabled,
  created_at,
  updated_at
`;

const findNotificationsPage = async ({ userId, page, limit, filters }) => {
  const client = ensureSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client
    .from("notifications")
    .select(NOTIFICATION_FIELDS, { count: "exact" })
    .eq("user_id", userId);

  if (filters.category) query = query.eq("category", filters.category);
  if (typeof filters.isRead === "boolean") {
    query = query.eq("is_read", filters.isRead);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to);

  handleSupabaseError(error, "Failed to fetch notifications");
  return { rows: data || [], totalItems: count || 0 };
};

const countUnread = async (userId) => {
  const client = ensureSupabase();
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  handleSupabaseError(error, "Failed to count unread notifications");
  return count || 0;
};

const findNotificationById = async ({ userId, id }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("notifications")
    .select(NOTIFICATION_FIELDS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  handleSupabaseError(error, "Failed to fetch notification");
  return data;
};

const markRead = async ({ userId, id }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select(NOTIFICATION_FIELDS)
    .maybeSingle();

  handleSupabaseError(error, "Failed to mark notification as read");
  return data;
};

const markAllRead = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false)
    .select("id");

  handleSupabaseError(error, "Failed to mark all notifications as read");
  return data || [];
};

const deleteNotification = async ({ userId, id }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  handleSupabaseError(error, "Failed to delete notification");
  return data;
};

const createNotification = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("notifications")
    .insert(payload)
    .select(NOTIFICATION_FIELDS)
    .single();

  handleSupabaseError(error, "Failed to create notification");
  return data;
};

// Looks for an existing notification with the same dedupe key for a user.
// Used to avoid creating duplicate event notifications.
const findByDedupeKey = async ({ userId, dedupeKey, unreadOnly = true }) => {
  const client = ensureSupabase();
  let query = client
    .from("notifications")
    .select(NOTIFICATION_FIELDS)
    .eq("user_id", userId)
    .eq("metadata->>_dedupe_key", dedupeKey);

  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  handleSupabaseError(error, "Failed to look up notification by dedupe key");
  return data;
};

const findSettingsByUserId = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("notification_settings")
    .select(SETTINGS_FIELDS)
    .eq("user_id", userId)
    .maybeSingle();

  handleSupabaseError(error, "Failed to fetch notification settings");
  return data;
};

const createSettings = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("notification_settings")
    .insert(payload)
    .select(SETTINGS_FIELDS)
    .single();

  handleSupabaseError(error, "Failed to create notification settings");
  return data;
};

const updateSettings = async ({ userId, changes }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("notification_settings")
    .update(changes)
    .eq("user_id", userId)
    .select(SETTINGS_FIELDS)
    .maybeSingle();

  handleSupabaseError(error, "Failed to update notification settings");
  return data;
};

const DEVICE_TOKEN_FIELDS = `
  id,
  user_id,
  token,
  platform,
  last_used_at,
  created_at,
  updated_at
`;

// Registers (or refreshes) a device token. Reusing the same token from a
// different account reassigns it via the unique `token` conflict target.
const upsertDeviceToken = async ({ userId, token, platform }) => {
  const client = ensureSupabase();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("device_tokens")
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        last_used_at: now,
        updated_at: now,
      },
      { onConflict: "token" },
    )
    .select(DEVICE_TOKEN_FIELDS)
    .single();

  handleSupabaseError(error, "Failed to register device token");
  return data;
};

const deleteDeviceTokenByValue = async ({ userId, token }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("device_tokens")
    .delete()
    .eq("token", token)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  handleSupabaseError(error, "Failed to remove device token");
  return data;
};

const findDeviceTokensByUserId = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("device_tokens")
    .select("token")
    .eq("user_id", userId);

  handleSupabaseError(error, "Failed to fetch device tokens");
  return (data || []).map((row) => row.token);
};

// Removes tokens FCM reported as invalid/unregistered.
const deleteDeviceTokens = async (tokens) => {
  if (!tokens || tokens.length === 0) return;
  const client = ensureSupabase();
  const { error } = await client
    .from("device_tokens")
    .delete()
    .in("token", tokens);

  handleSupabaseError(error, "Failed to prune device tokens");
};

module.exports = {
  findNotificationsPage,
  countUnread,
  findNotificationById,
  markRead,
  markAllRead,
  deleteNotification,
  createNotification,
  findByDedupeKey,
  findSettingsByUserId,
  createSettings,
  updateSettings,
  upsertDeviceToken,
  deleteDeviceTokenByValue,
  findDeviceTokensByUserId,
  deleteDeviceTokens,
};
