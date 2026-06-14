const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');

const generateToken = (payload, expiresIn = '1d') => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT secret is not configured', 500);
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

module.exports = {
  generateToken
};