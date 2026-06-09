const AppError = require('../errors/AppError');
const asyncHandler = require('../utils/asyncHandler');

const validate = (schema, property = 'body') =>
  asyncHandler(async (req, res, next) => {
    if (!schema) {
      return next();
    }

    const data = req[property];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        message: detail.message,
        path: detail.path.join('.'),
      }));

      return next(new AppError('Validation failed', 400, { details }));
    }

    req[property] = value;
    return next();
  });

const validateBody = (schema) => validate(schema, 'body');
const validateQuery = (schema) => validate(schema, 'query');
const validateParams = (schema) => validate(schema, 'params');

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
};
