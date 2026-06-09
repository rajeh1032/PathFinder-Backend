const sendSuccess = (
  res,
  data = null,
  message = 'Success',
  statusCode = 200,
  meta = null,
) => {
  const payload = {
    success: true,
    message,
  };

  if (data !== undefined) {
    payload.data = data;
  }

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

const sendError = (
  res,
  message = 'Something went wrong',
  statusCode = 500,
  errors = null,
  details = null,
) => {
  const payload = {
    success: false,
    message,
    statusCode,
  };

  if (errors) {
    payload.errors = errors;
  }

  if (details) {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
};

const sendPaginated = (
  res,
  data,
  pagination,
  message = 'Success',
  statusCode = 200,
) => {
  return sendSuccess(res, data, message, statusCode, { pagination });
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
};
