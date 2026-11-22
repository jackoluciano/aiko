const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const db = require('../../db');
const { requireJwt, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ApiError } = require('../../lib/errors');
const { createPlayerSchema, patchPlayerSchema } = require('./schema');

const router = express.Router();
router.use(requireJwt);

function assertPlayerAccess(req, playerId) {
  const player = db.prepare('SELECT * FROM players WHERE id=?').get(playerId);
  if (!player) throw new ApiError(404, 'NOT_FOUND', 'Profil anak tidak ditemukan.');
  if (req.auth.role === 'child' && req.auth.playerId !== playerId) {
    throw new ApiError(403, 'FORBIDDEN', 'Anak hanya dapat mengakses profilnya sendiri.');
  }
  if (req.auth.role === 'parent' && player.parent_id !== req.auth.sub) {
    throw new ApiError(403, 'FORBIDDEN', 'Profil anak ini bukan milik akun Anda.');
  }
  return player;
}

router.post('/', requireRole('parent'), validate(createPlayerSchema), (req, res) => {
  const existing = db.prepare('SELECT id FROM players WHERE username=?').get(req.body.username);
  if (existing) throw new ApiError(409, 'CONFLICT', 'Nama pengguna anak sudah digunakan.');
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO players (id,parent_id,display_name,username,pin_hash,grade,daily_limit_minutes,avatar,share_progress,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, req.auth.sub, req.body.display_name, req.body.username,
      bcrypt.hashSync(req.body.pin, 10), req.body.grade, req.body.daily_limit_minutes, req.body.avatar || null,
      req.body.share_progress ? 1 : 0, now);
    const modules = db.prepare('SELECT id FROM modules WHERE is_active=1 AND grade_min<=? AND grade_max>=? ORDER BY position')
      .all(req.body.grade, req.body.grade);
    modules.forEach((module, index) => {
      db.prepare('INSERT OR IGNORE INTO player_modules (player_id,module_id,status,best_score) VALUES (?,?,?,0)')
        .run(id, module.id, index === 0 ? 'berjalan' : 'terkunci');
    });
  });
  transaction();
  const player = db.prepare('SELECT * FROM players WHERE id=?').get(id);
  res.status(201).json({
    id: player.id, parent_id: player.parent_id, display_name: player.display_name,
    username: player.username, grade: player.grade, daily_limit_minutes: player.daily_limit_minutes,
    avatar: player.avatar, share_progress: Boolean(player.share_progress), created_at: player.created_at
  });
});

router.get('/', requireRole('parent'), (req, res) => {
  res.json(db.prepare('SELECT id,display_name,username,grade,daily_limit_minutes,avatar,share_progress,created_at FROM players WHERE parent_id=?')
    .all(req.auth.sub));
});

router.get('/:id', (req, res) => {
  const player = assertPlayerAccess(req, req.params.id);
  res.json({
    id: player.id, display_name: player.display_name, username: player.username, grade: player.grade,
    daily_limit_minutes: player.daily_limit_minutes, avatar: player.avatar,
    share_progress: Boolean(player.share_progress), created_at: player.created_at
  });
});

router.patch('/:id', requireRole('parent'), validate(patchPlayerSchema), (req, res) => {
  const player = assertPlayerAccess(req, req.params.id);
  if (player.parent_id !== req.auth.sub) throw new ApiError(403, 'FORBIDDEN', 'Anda tidak boleh mengubah profil ini.');
  const fields = [];
  const values = [];
  for (const key of ['display_name', 'grade', 'daily_limit_minutes', 'avatar']) {
    if (req.body[key] !== undefined) { fields.push(`${key}=?`); values.push(req.body[key]); }
  }
  if (req.body.share_progress !== undefined) { fields.push('share_progress=?'); values.push(req.body.share_progress ? 1 : 0); }
  db.prepare(`UPDATE players SET ${fields.join(',')} WHERE id=?`).run(...values, req.params.id);
  res.json(db.prepare('SELECT id,display_name,username,grade,daily_limit_minutes,avatar,share_progress,created_at FROM players WHERE id=?').get(req.params.id));
});

router.delete('/:id', requireRole('parent'), (req, res) => {
  assertPlayerAccess(req, req.params.id);
  db.prepare('DELETE FROM players WHERE id=?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
