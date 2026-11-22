const { ApiError } = require('../lib/errors');

function errorHandler(err, req, res, next) {
  const apiError = err instanceof ApiError
    ? err
    : new ApiError(500, 'INTERNAL', 'Terjadi gangguan pada layanan.');
  res.status(apiError.status).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details || []
    }
  });
}

module.exports = { errorHandler };
