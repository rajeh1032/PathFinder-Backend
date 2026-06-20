const AppError = require('./AppError');
const logger = require('../utils/logger');

const statusCodeToErrorCode = (statusCode) => {
  if (statusCode === 400) return 'VALIDATION_ERROR';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 409) return 'CONFLICT';
  return statusCode >= 500 ? 'INTERNAL_ERROR' : 'NOT_FOUND';
};

const errorHandler = (err, req, res, next) => {
  // 1. If headers are already sent, delegate to the default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;
  let isOperational = err.isOperational || false;
  let errorCode = err instanceof AppError && err.code
    ? err.code
    : statusCodeToErrorCode(statusCode);

  // 2. Normalize common library/third-party errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    isOperational = true;
    errorCode = 'UNAUTHORIZED';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    isOperational = true;
    errorCode = 'UNAUTHORIZED';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    isOperational = true;
    errorCode = 'VALIDATION_ERROR';
    // Optional: If using Mongoose or Joi, extract details here
    if (err.errors) {
      details = Object.values(err.errors).map(el => el.message);
    }
  }

  // 3. Log Unexpected/Programmer Errors (Non-operational)
  if (!isOperational) {
    logger.error(
      {
        err,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      },
      'Unhandled application error 💥',
    );

    // CRITICAL: Overwrite the message in production so internal details don't leak
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal server error';
      details = null;
      errorCode = 'INTERNAL_ERROR';
    }
  }

  // 4. Construct response
  const publicDetails = Array.isArray(details)
    ? details
    : Array.isArray(details?.details)
      ? details.details
      : [];
  const response = {
    success: false,
    statusCode,
    message,
    error: {
      code: errorCode,
      details: publicDetails,
    },
  };

  if (publicDetails.length) {
    response.details = publicDetails;
  }

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
