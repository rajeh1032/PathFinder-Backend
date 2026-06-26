const AppError = require("../../common/errors/AppError");
const { buildPaginationMeta } = require("../../common/utils/pagination");
const notificationsRepository = require("./notifications.repository");

const mapNotification = (row) => ({
  id: row.id,
  type: row.type,
  category: row.category,
  title: row.title,
  body: row.body,
  action_label: row.action_label,
  action_url: row.action_url,
  metadata:
    row.metadata && typeof row.metadata === "object" ? row.metadata : {},
  is_read: row.is_read,
  read_at: row.read_at,
  created_at: row.created_at,
});

const mapSettings = (row) => ({
  push_enabled: row.push_enabled,
  email_enabled: row.email_enabled,
  job_alerts_enabled: row.job_alerts_enabled,
  roadmap_reminders_enabled: row.roadmap_reminders_enabled,
  interview_reminders_enabled: row.interview_reminders_enabled,
  ai_tips_enabled: row.ai_tips_enabled,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const listNotifications = async ({ userId, query }) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const filters = {
    category: query.category,
    isRead: query.unreadOnly ? false : query.isRead,
  };

  const { rows, totalItems } = await notificationsRepository.findNotificationsPage(
    { userId, page, limit, filters },
  );

  const unreadCount = await notificationsRepository.countUnread(userId);

  return {
    notifications: rows.map(mapNotification),
    unreadCount,
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
};

const getUnreadCount = async ({ userId }) => {
  const unreadCount = await notificationsRepository.countUnread(userId);
  return { unreadCount };
};

const markAsRead = async ({ userId, notificationId }) => {
  const row = await notificationsRepository.markRead({
    userId,
    id: notificationId,
  });
  if (!row) {
    throw new AppError("Notification not found", 404);
  }

  return { notification: mapNotification(row) };
};

const markAllAsRead = async ({ userId }) => {
  const updated = await notificationsRepository.markAllRead(userId);
  return { updatedCount: updated.length };
};

const dismissNotification = async ({ userId, notificationId }) => {
  const deleted = await notificationsRepository.deleteNotification({
    userId,
    id: notificationId,
  });
  if (!deleted) {
    throw new AppError("Notification not found", 404);
  }

  return { id: notificationId };
};

const DEFAULT_SETTINGS = {
  push_enabled: true,
  email_enabled: true,
  job_alerts_enabled: true,
  roadmap_reminders_enabled: true,
  interview_reminders_enabled: true,
  ai_tips_enabled: true,
};

// Returns the user's settings row, creating a default row the first time.
const ensureSettings = async (userId) => {
  const existing = await notificationsRepository.findSettingsByUserId(userId);
  if (existing) {
    return existing;
  }

  return notificationsRepository.createSettings({
    user_id: userId,
    ...DEFAULT_SETTINGS,
  });
};

const getSettings = async ({ userId }) => {
  const row = await ensureSettings(userId);
  return { settings: mapSettings(row) };
};

const updateSettings = async ({ userId, payload }) => {
  await ensureSettings(userId);

  const changes = { updated_at: new Date().toISOString() };
  [
    "push_enabled",
    "email_enabled",
    "job_alerts_enabled",
    "roadmap_reminders_enabled",
    "interview_reminders_enabled",
    "ai_tips_enabled",
  ].forEach((key) => {
    if (payload[key] !== undefined) changes[key] = payload[key];
  });

  const row = await notificationsRepository.updateSettings({ userId, changes });
  if (!row) {
    throw new AppError("Notification settings not found", 404);
  }

  return { settings: mapSettings(row) };
};

// Internal helper for other feature services to create a notification.
// Not exposed over HTTP. Example:
//   createUserNotification({ userId, type: 'job_match', category: 'job', ... })
//
// Pass `dedupeKey` to avoid duplicates: if a matching notification already
// exists (unread by default) it is returned instead of creating a new one.
const createUserNotification = async ({
  userId,
  type,
  category,
  title,
  body = null,
  actionLabel = null,
  actionUrl = null,
  metadata = {},
  dedupeKey = null,
  dedupeUnreadOnly = true,
}) => {
  if (!userId) throw new AppError("userId is required", 400);
  if (!type) throw new AppError("Notification type is required", 400);
  if (!category) throw new AppError("Notification category is required", 400);
  if (!title) throw new AppError("Notification title is required", 400);

  if (dedupeKey) {
    const existing = await notificationsRepository.findByDedupeKey({
      userId,
      dedupeKey,
      unreadOnly: dedupeUnreadOnly,
    });
    if (existing) {
      return mapNotification(existing);
    }
  }

  const finalMetadata = dedupeKey
    ? { ...metadata, _dedupe_key: dedupeKey }
    : metadata;

  const row = await notificationsRepository.createNotification({
    user_id: userId,
    type,
    category,
    title,
    body,
    action_label: actionLabel,
    action_url: actionUrl,
    metadata: finalMetadata,
  });

  return mapNotification(row);
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  getSettings,
  updateSettings,
  createUserNotification,
};
