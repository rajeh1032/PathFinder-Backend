const { sendSuccess, sendError } = require('../../common/utils/apiResponse.js');
const asyncHandler = require('../../common/utils/asyncHandler.js');
const logger = require('../../common/utils/logger');

const {
  createUser,
  loginUser,
  getMe,
  getCurrentUser,
  changePassword,
} = require('./auth.service.js');

const register = asyncHandler(async (req, res) => {
  const authData = await createUser(req.body);
  if (!authData) {
    logger.error('User registration failed', { body: req.body });
    return sendError(res, {}, 'User registration failed', 500);
  }

  logger.info('User registered successfully', { userId: authData.user.id });
  return sendSuccess(res, authData, 'User registered successfully');
});

const login = asyncHandler(async (req, res) => {
  const authData = await loginUser(req.body.email, req.body.password);
  if (!authData) {
    logger.error('Login failed', { body: req.body });
    return sendError(res, {}, 'Invalid email or password', 401);
  }

  return sendSuccess(res, authData, 'Login successful :)');
});

const me = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  const currentUser = await getCurrentUser(userId);
  return sendSuccess(res, currentUser, 'Authenticated user fetched successfully');
});

const getUser = asyncHandler(async (req, res) => {
  const user = await getMe(req.user.userId);

  if (!user) {
    return sendError(res, {}, 'User Not Found', 404);
  }

  return sendSuccess(res, { user });
});

const changeUserPassword = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const password = req.body.password;
  const newPassword = req.body.newPassword;
  const message = await changePassword(userId, password, newPassword);

  if (!message) {
    return sendError(res, {}, 'Something Went wrong :(');
  }

  return sendSuccess(res, {}, 'Password changed :)');
});

module.exports = {
  register,
  login,
  me,
  getUser,
  changeUserPassword,
};
