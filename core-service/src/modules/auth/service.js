const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const config = require('../../config');
const { ApiError } = require('../../lib/errors');

const failedAttempts = new Map();
const genericLoginError = () => new ApiError(401, 'UNAUTHORIZED', 'Email atau password salah.');

function isLocked(email) {
  const record = failedAttempts.get(email);
  return record && record.count >= 5 && Date.now() - record.lastAt < 5 * 60 * 1000;
}

function register({ email, password, consent }) {
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
  if (existing) throw new ApiError(409, 'CONFLICT', 'Email sudah terdaftar.');
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id,email,password_hash,role,consent_given,consent_at,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, email.toLowerCase(), bcrypt.hashSync(password, 10), 'parent', consent ? 1 : 0, now, now);
  return { id, email: email.toLowerCase(), role: 'parent' };
}

function login({ email, password }) {
  const normalized = email.toLowerCase();
  if (isLocked(normalized)) throw new ApiError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.');
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(normalized);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    const record = failedAttempts.get(normalized) || { count: 0, lastAt: 0 };
    failedAttempts.set(normalized, { count: record.count + 1, lastAt: Date.now() });
    throw genericLoginError();
  }
  failedAttempts.delete(normalized);
  const token = jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN, algorithm: 'HS256' });
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

function childLogin({ username, pin }) {
  const player = db.prepare('SELECT * FROM players WHERE username=?').get(username);
  if (!player || !bcrypt.compareSync(pin, player.pin_hash)) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Nama pengguna atau PIN salah.');
  }
  const token = jwt.sign(
    { sub: player.parent_id, role: 'child', playerId: player.id },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
  return { token, player: publicPlayer(player) };
}

function publicPlayer(player) {
  return {
    id: player.id,
    display_name: player.display_name,
    username: player.username,
    grade: player.grade,
    daily_limit_minutes: player.daily_limit_minutes,
    avatar: player.avatar,
    share_progress: Boolean(player.share_progress)
  };
}

module.exports = { register, login, childLogin, publicPlayer };
