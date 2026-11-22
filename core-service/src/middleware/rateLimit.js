const rateLimit = require('express-rate-limit');
const { ApiError } = require('../lib/errors');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan. Coba lagi nanti.', details: [] }
    });
  }
});

module.exports = { globalLimiter };
