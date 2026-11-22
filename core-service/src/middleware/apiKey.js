const crypto = require('crypto');
const db = require('../db');
const { ApiError } = require('../lib/errors');

function requireApiKey(req, res, next) {
  const raw = req.get('X-API-Key');
  if (!raw) throw new ApiError(401, 'UNAUTHORIZED', 'X-API-Key diperlukan.');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  let key = null;
  for (const candidate of db.prepare('SELECT * FROM api_keys WHERE active=1').all()) {
    const expected = Buffer.from(candidate.key_hash, 'hex');
    const provided = Buffer.from(hash, 'hex');
    if (expected.length === provided.length && crypto.timingSafeEqual(expected, provided)) {
      key = candidate;
      break;
    }
  }
  if (!key) throw new ApiError(401, 'UNAUTHORIZED', 'API key tidak valid atau sudah dicabut.');

  db.prepare('UPDATE api_keys SET last_used_at=?, request_count=request_count+1 WHERE id=?')
    .run(new Date().toISOString(), key.id);
  req.apiKey = key;

  const logId = crypto.randomUUID();
  db.prepare('INSERT INTO api_call_log (id,api_key_id,method,path,status,created_at) VALUES (?,?,?,?,?,?)')
    .run(logId, key.id, req.method, req.originalUrl, 200, new Date().toISOString());
  res.on('finish', () => {
    db.prepare('UPDATE api_call_log SET status=? WHERE id=?').run(res.statusCode, logId);
  });
  next();
}

module.exports = { requireApiKey };
