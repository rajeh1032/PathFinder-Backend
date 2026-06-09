const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const createRateLimiter = (options = {}) =>
  rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    limit: options.limit || 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ipKeyGenerator,
    skip: options.skip || (() => false),
    message: options.message || {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
  });

const generalLimiter = createRateLimiter();

module.exports = {
  createRateLimiter,
  generalLimiter,
};
