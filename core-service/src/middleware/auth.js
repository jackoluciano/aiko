const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../lib/errors');

function requireJwt(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Token autentikasi diperlukan.');
  try {
    req.auth = jwt.verify(token, config.JWT_SECRET);
    next();
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Token tidak valid atau sudah kedaluwarsa.');
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'Anda tidak memiliki izin untuk aksi ini.');
    }
    next();
  };
}

module.exports = { requireJwt, requireRole };
