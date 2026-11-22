const express = require('express');
const db = require('../../db');
const { requireApiKey } = require('../../middleware/apiKey');
const { ApiError } = require('../../lib/errors');

const router = express.Router();
const keyWindows = new Map();
router.use(requireApiKey);
router.use((req, res, next) => {
  const keyId = req.apiKey.id;
  const now = Date.now();
  let record = keyWindows.get(keyId);
  if (!record || now - record.startedAt >= 60000) record = { startedAt: now, count: 0 };
  record.count++;
  keyWindows.set(keyId, record);
  if (record.count > 60) throw new ApiError(429, 'RATE_LIMITED', 'Batas pemanggilan API key sudah tercapai.', []);
  next();
});

router.get('/topics', (req, res) => {
  res.json(db.prepare('SELECT DISTINCT topic FROM modules WHERE is_active=1 ORDER BY topic').all().map((row) => row.topic));
});

router.get('/quizzes', (req, res) => {
  const topic = req.query.topic || null;
  const grade = req.query.grade ? Number(req.query.grade) : null;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
  let sql = `SELECT q.id,q.module_id,q.topic,q.text,q.options_json,q.difficulty,q.explanation,q.image_url
    FROM questions q JOIN modules m ON m.id=q.module_id WHERE m.is_active=1`;
  const params = [];
  if (topic) { sql += ' AND q.topic=?'; params.push(topic); }
  if (grade) { sql += ' AND m.grade_min<=? AND m.grade_max>=?'; params.push(grade, grade); }
  sql += ' ORDER BY RANDOM() LIMIT ?';
  params.push(limit);
  const questions = db.prepare(sql).all(...params).map((row) => ({
    id: row.id, text: row.text, options: JSON.parse(row.options_json),
    difficulty: row.difficulty, topic: row.topic, image_url: row.image_url
  }));
  res.json(questions);
});

router.post('/quizzes/check', express.json({ limit: '100kb' }), (req, res) => {
  const questionId = req.body.questionId;
  const chosenIndex = req.body.chosenIndex;
  if (!questionId || !Number.isInteger(chosenIndex)) throw new ApiError(400, 'VALIDATION_ERROR', 'Data pemeriksaan jawaban tidak valid.', []);
  const question = db.prepare('SELECT * FROM questions WHERE id=?').get(questionId);
  if (!question) throw new ApiError(404, 'NOT_FOUND', 'Soal tidak ditemukan.');
  const isCorrect = chosenIndex === question.correct_index;
  res.json({ isCorrect, correctIndex: question.correct_index, explanation: question.explanation });
});

router.get('/progress/:playerId', (req, res) => {
  const player = db.prepare('SELECT id,share_progress FROM players WHERE id=?').get(req.params.playerId);
  if (!player) throw new ApiError(404, 'NOT_FOUND', 'Profil anak tidak ditemukan.');
  if (!player.share_progress) throw new ApiError(403, 'FORBIDDEN', 'Profil anak belum mengizinkan pembagian progres.');
  const points = db.prepare('SELECT COALESCE(SUM(delta),0) AS points FROM points_ledger WHERE player_id=?').get(player.id).points;
  const level = Math.floor(points / 100) + 1;
  const completedModules = db.prepare(`SELECT COUNT(*) AS count FROM player_modules WHERE player_id=? AND status='selesai'`).get(player.id).count;
  const mastery = db.prepare('SELECT topic,score,attempts FROM mastery WHERE player_id=?').all(player.id);
  res.json({ playerId: player.id, points, level, completedModules, mastery });
});

module.exports = router;
