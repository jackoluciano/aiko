const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const { requireJwt, requireRole } = require('../../middleware/auth');
const { ApiError } = require('../../lib/errors');
const { levelFromPoints } = require('../../lib/gamification');
const { todayJakarta } = require('../../lib/time');

const router = express.Router();
router.use(requireJwt);

function assertPlayer(req, playerId) {
  const player = db.prepare('SELECT * FROM players WHERE id=?').get(playerId);
  if (!player) throw new ApiError(404, 'NOT_FOUND', 'Profil anak tidak ditemukan.');
  if (req.auth.role === 'child' && req.auth.playerId !== playerId) throw new ApiError(403, 'FORBIDDEN', 'Anak hanya dapat mengakses data dirinya sendiri.');
  if (req.auth.role === 'parent' && player.parent_id !== req.auth.sub) throw new ApiError(403, 'FORBIDDEN', 'Profil anak ini bukan milik akun Anda.');
  return player;
}

router.get('/players/:id/progress', (req, res) => {
  assertPlayer(req, req.params.id);
  const points = db.prepare('SELECT COALESCE(SUM(delta),0) AS points FROM points_ledger WHERE player_id=?').get(req.params.id).points;
  const level = levelFromPoints(points);
  const badges = db.prepare(`SELECT b.id,b.code,b.name,b.description,pb.earned_at
    FROM player_badges pb JOIN badges b ON b.id=pb.badge_id WHERE pb.player_id=?`).all(req.params.id);
  const completedModules = db.prepare(`SELECT COUNT(*) AS count FROM player_modules WHERE player_id=? AND status='selesai'`).get(req.params.id).count;
  const mastery = db.prepare('SELECT topic,score,attempts,updated_at FROM mastery WHERE player_id=?').all(req.params.id);
  const todayMission = db.prepare('SELECT * FROM daily_missions WHERE player_id=? AND date=? LIMIT 1').get(req.params.id, todayJakarta()) || null;
  const history = db.prepare('SELECT id,delta,reason,ref_id,created_at FROM points_ledger WHERE player_id=? ORDER BY created_at DESC').all(req.params.id);
  res.json({
    points, level: level.level, nextLevelAt: level.nextLevelAt, badges,
    completedModules, mastery, todayMission, history
  });
});

router.get('/players/:id/badges', (req, res) => {
  assertPlayer(req, req.params.id);
  const badges = db.prepare(`SELECT b.*, CASE WHEN pb.player_id IS NULL THEN 0 ELSE 1 END AS earned,
    pb.earned_at FROM badges b LEFT JOIN player_badges pb ON pb.badge_id=b.id AND pb.player_id=? ORDER BY b.code`).all(req.params.id);
  res.json(badges);
});

router.get('/players/:id/missions', (req, res) => {
  assertPlayer(req, req.params.id);
  const date = req.query.date || todayJakarta();
  res.json(db.prepare(`SELECT dm.*, m.title AS module_title FROM daily_missions dm JOIN modules m ON m.id=dm.module_id
    WHERE dm.player_id=? AND dm.date=? ORDER BY dm.status`).all(req.params.id, date));
});

router.post('/missions/:id/check', requireRole('parent'), (req, res) => {
  const mission = db.prepare(`SELECT dm.*,p.parent_id FROM daily_missions dm JOIN players p ON p.id=dm.player_id WHERE dm.id=?`).get(req.params.id);
  if (!mission) throw new ApiError(404, 'NOT_FOUND', 'Misi tidak ditemukan.');
  if (mission.parent_id !== req.auth.sub) throw new ApiError(403, 'FORBIDDEN', 'Misi ini bukan milik anak Anda.');
  if (mission.status === 'checked') throw new ApiError(409, 'CONFLICT', 'Misi sudah dicentang.');
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    db.prepare('UPDATE daily_missions SET status=?,checked_by=?,checked_at=? WHERE id=?')
      .run('checked', req.auth.sub, now, mission.id);
    db.prepare('INSERT INTO points_ledger (id,player_id,delta,reason,ref_id,created_at) VALUES (?,?,?,?,?,?)')
      .run(crypto.randomUUID(), mission.player_id, 10, 'mission_checked', mission.id, now);
  });
  transaction();
  res.json({ missionId: mission.id, status: 'checked', pointsEarned: 10 });
});

module.exports = router;
