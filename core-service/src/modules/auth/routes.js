const express = require('express');
const db = require('../../db');
const { validate } = require('../../middleware/validate');
const { requireJwt } = require('../../middleware/auth');
const { registerSchema, loginSchema, childLoginSchema } = require('./schema');
const service = require('./service');

const router = express.Router();
router.post('/register', validate(registerSchema), (req, res) => res.status(201).json(service.register(req.body)));
router.post('/login', validate(loginSchema), (req, res) => res.json(service.login(req.body)));
router.post('/child-login', validate(childLoginSchema), (req, res) => res.json(service.childLogin(req.body)));
router.get('/me', requireJwt, (req, res) => {
  if (req.auth.role === 'child') {
    const player = db.prepare('SELECT * FROM players WHERE id=?').get(req.auth.playerId);
    return res.json({ role: 'child', player: service.publicPlayer(player) });
  }
  const user = db.prepare('SELECT id,email,role FROM users WHERE id=?').get(req.auth.sub);
  res.json({ role: user.role, user });
});

module.exports = router;
