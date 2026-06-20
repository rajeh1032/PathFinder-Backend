const AppError = require('../errors/AppError');

const getRequestUserId = (req, { required = true } = {}) => {
  const userId =
    req.user?.id ||
    req.user?.userId ||
    req.body?.userId ||
    req.query?.userId ||
    req.params?.userId ||
    null;

  if (!userId && required) {
    throw new AppError('Authentication is required', 401);
  }

  return userId;
};

const stripUserId = (payload = {}) => {
  const { userId, ...rest } = payload;
  return rest;
};

module.exports = {
  getRequestUserId,
  stripUserId,
};
