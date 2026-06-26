const {
  sendPaginated,
  sendSuccess,
} = require("../../common/utils/apiResponse");
const asyncHandler = require("../../common/utils/asyncHandler");
const { getRequestUserId } = require("../../common/utils/requestUser");
const notificationsService = require("./notifications.service");

const getNotifications = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await notificationsService.listNotifications({
    userId,
    query: req.query,
  });

  return sendPaginated(
    res,
    {
      notifications: result.notifications,
      unreadCount: result.unreadCount,
    },
    result.pagination,
    "Notifications fetched successfully",
  );
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await notificationsService.getUnreadCount({ userId });
  return sendSuccess(res, result, "Unread count fetched successfully");
});

const markAsRead = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await notificationsService.markAsRead({
    userId,
    notificationId: req.params.id,
  });

  return sendSuccess(res, result, "Notification marked as read");
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await notificationsService.markAllAsRead({ userId });
  return sendSuccess(res, result, "All notifications marked as read");
});

const dismissNotification = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await notificationsService.dismissNotification({
    userId,
    notificationId: req.params.id,
  });

  return sendSuccess(res, result, "Notification removed");
});

const getSettings = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await notificationsService.getSettings({ userId });
  return sendSuccess(res, result, "Notification settings fetched successfully");
});

const updateSettings = asyncHandler(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await notificationsService.updateSettings({
    userId,
    payload: req.body,
  });

  return sendSuccess(res, result, "Notification settings updated successfully");
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  getSettings,
  updateSettings,
};
