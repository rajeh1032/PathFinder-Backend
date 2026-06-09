const AppError = require('./AppError');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // 1. If headers are already sent, delegate to the default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;
  let isOperational = err.isOperational || false;

  // 2. Normalize common library/third-party errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    isOperational = true;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    isOperational = true;
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
    }
  }

  // 4. Construct response
  const response = {
    success: false,
    statusCode,
    message,
  };

  if (details) {
    response.details = details;
  }

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;