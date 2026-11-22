const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const config = require('../../config');
const { ApiError } = require('../../lib/errors');

const router = express.Router();
router.use((req, res, next) => {
  if (req.get('X-Admin-Token') !== config.ADMIN_TOKEN) throw new ApiError(401, 'UNAUTHORIZED', 'Token admin tidak valid.');
  next();
});

router.post('/api-keys', express.json({ limit: '100kb' }), (req, res) => {
  const groupName = typeof req.body.group_name === 'string' ? req.body.group_name.trim() : '';
  if (!groupName || groupName.length > 100) throw new ApiError(400, 'VALIDATION_ERROR', 'Nama kelompok tidak valid.', []);
  const existing = db.prepare('SELECT id FROM api_keys WHERE group_name=?').get(groupName);
  if (existing) throw new ApiError(409, 'CONFLICT', 'Kelompok ini sudah memiliki API key.');
  const raw = `aiko_${crypto.randomBytes(24).toString('hex')}`;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO api_keys (id,group_name,key_hash,prefix,active,created_at,request_count) VALUES (?,?,?,?,?,?,0)')
    .run(id, groupName, crypto.createHash('sha256').update(raw).digest('hex'), raw.slice(0, 8), 1, new Date().toISOString());
  res.status(201).json({ id, group_name: groupName, key: raw });
});

router.get('/api-keys', (req, res) => {
  res.json(db.prepare('SELECT id,group_name,prefix,active,created_at,last_used_at,request_count FROM api_keys').all());
});

router.delete('/api-keys/:id', (req, res) => {
  const result = db.prepare('UPDATE api_keys SET active=0 WHERE id=?').run(req.params.id);
  if (!result.changes) throw new ApiError(404, 'NOT_FOUND', 'API key tidak ditemukan.');
  res.status(204).send();
});

module.exports = router;
