const express = require('express');
const db = require('../../db');
const { requireJwt } = require('../../middleware/auth');

const router = express.Router();
router.use(requireJwt);
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT DISTINCT topic FROM modules WHERE is_active=1 ORDER BY topic').all().map((row) => row.topic));
});
module.exports = router;
