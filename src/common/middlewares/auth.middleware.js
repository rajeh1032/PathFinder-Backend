const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.get('Authorization') || '';
  const cookieToken = req.cookies?.token;
  let token = null;

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return next(new AppError('Authentication token missing', 401));
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret);
    req.user = decoded.user || decoded;
    return next();
  } catch (error) {
    return next(
      new AppError('Invalid or expired token', 401, { reason: error.message }),
    );
  }
});

const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden resource', 403));
    }

    return next();
  };

module.exports = {
  authenticate,
  authorize,
};
