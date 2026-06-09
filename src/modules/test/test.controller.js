const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const logger = require('../../common/utils/logger');
const { createDemoError } = require('./test.service');

const authTest = asyncHandler(async (req, res) => {
  logger.info('Auth test route used', { user: req.user });
  return sendSuccess(res, { user: req.user }, 'Auth middleware works');
});

const validateTest = asyncHandler(async (req, res) => {
  logger.info('Validation test route used', { body: req.body });
  return sendSuccess(res, req.body, 'Validation middleware works');
});

const errorTest = asyncHandler(async (req, res, next) => {
  logger.warn('Error test route used');
  throw createDemoError();
});

module.exports = {
  authTest,
  validateTest,
  errorTest,
};
