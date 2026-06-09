const AppError = require('../../common/errors/AppError');

const createDemoError = () =>
  new AppError('Demo error from shared error handler', 400);

module.exports = {
  createDemoError,
};
