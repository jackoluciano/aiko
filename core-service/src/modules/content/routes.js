const express = require('express');
const db = require('../../db');
const { requireJwt } = require('../../middleware/auth');
const { ApiError } = require('../../lib/errors');

const router = express.Router();
router.use(requireJwt);

router.get('/', (req, res) => {
  const grade = req.query.grade ? Number(req.query.grade) : null;
  const topic = req.query.topic || null;
  let sql = 'SELECT id,slug,title,topic,grade_min,grade_max,position,summary,source_ref,is_active FROM modules WHERE is_active=1';
  const params = [];
  if (grade) { sql += ' AND grade_min<=? AND grade_max>=?'; params.push(grade, grade); }
  if (topic) { sql += ' AND topic=?'; params.push(topic); }
  sql += ' ORDER BY position';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const module = db.prepare('SELECT id,slug,title,topic,grade_min,grade_max,position,summary,content_md,source_ref,is_active FROM modules WHERE id=? AND is_active=1')
    .get(req.params.id);
  if (!module) throw new ApiError(404, 'NOT_FOUND', 'Modul tidak ditemukan.');
  res.json(module);
});

module.exports = router;
