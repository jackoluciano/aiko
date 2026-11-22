const { ApiError } = require('../lib/errors');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Data yang dikirim belum lengkap atau tidak valid.', result.error.issues);
    }
    req[property] = result.data;
    next();
  };
}

module.exports = { validate };
