const { sendSuccess, sendError } = require('../../common/utils/apiResponse.js');
const asyncHandler = require('../../common/utils/asyncHandler.js');
const logger = require('../../common/utils/logger');

const { createUser,loginUser } = require('./auth.service.js');

const register = asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  if (!user) {
    logger.error('User registration failed', { body: req.body });
    return sendError(res, {}, 'User registration failed', 500);
  }

  logger.info('User registered successfully', { userId: user.id });
  return sendSuccess(res, { user }, 'User registered successfully');
});

const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body.email, req.body.password);
  if (!user) {
    logger.error('Login failed', { body: req.body });
    return sendError(res, {}, 'Invalid email or password', 401);
  }

  return sendSuccess(res, { user }, 'Login successful :)');
});

module.exports = {
  register,
  login,
};
