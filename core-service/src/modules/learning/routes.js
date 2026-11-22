const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const { requireJwt } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ApiError } = require('../../lib/errors');
const { startQuizSchema, answerSchema } = require('./schema');
const { QUIZ_LENGTH, nextDifficulty, selectQuestion, quizScore } = require('../../lib/adaptive');
const { updateMastery } = require('../../lib/mastery');
const { pointsForQuiz, levelFromPoints } = require('../../lib/gamification');
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

function publicQuestion(row) {
  return { id: row.id, text: row.text, options: JSON.parse(row.options_json), difficulty: row.difficulty, topic: row.topic, image_url: row.image_url };
}

router.get('/players/:id/path', (req, res) => {
  const player = assertPlayer(req, req.params.id);
  const modules = db.prepare(`SELECT m.*, pm.status, pm.best_score
    FROM modules m JOIN player_modules pm ON pm.module_id=m.id
    WHERE pm.player_id=? AND m.is_active=1 AND m.grade_min<=? AND m.grade_max>=?
    ORDER BY m.position`).all(player.id, player.grade, player.grade);
  const weakest = db.prepare('SELECT topic,score FROM mastery WHERE player_id=? ORDER BY score ASC LIMIT 1').get(player.id);
  let recommended = modules.find((module) => module.status === 'berjalan')?.id || null;
  if (weakest && weakest.score < 60) {
    const weakModule = modules.find((module) => module.topic === weakest.topic && module.status !== 'selesai');
    if (weakModule) recommended = weakModule.id;
  }
  res.json({
    recommended_next: recommended,
    modules: modules.map((module) => ({
      id: module.id, slug: module.slug, title: module.title, topic: module.topic,
      position: module.position, status: module.status, best_score: module.best_score
    }))
  });
});

router.post('/quizzes/:moduleId/start', validate(startQuizSchema), (req, res) => {
  const player = assertPlayer(req, req.body.playerId);
  const module = db.prepare('SELECT * FROM modules WHERE id=? AND is_active=1').get(req.params.moduleId);
  if (!module) throw new ApiError(404, 'NOT_FOUND', 'Modul tidak ditemukan.');
  const link = db.prepare('SELECT * FROM player_modules WHERE player_id=? AND module_id=?').get(player.id, module.id);
  if (!link || link.status === 'terkunci') throw new ApiError(403, 'MODULE_LOCKED', 'Modul ini masih terkunci.');

  const today = todayJakarta();
  const learned = db.prepare(`SELECT COALESCE(SUM(duration_seconds),0) AS seconds FROM quiz_sessions
    WHERE player_id=? AND substr(started_at,1,10)>=?`).get(player.id, today);
  if (Math.floor(learned.seconds / 60) >= player.daily_limit_minutes) {
    throw new ApiError(403, 'DAILY_LIMIT_REACHED', 'Batas waktu belajar hari ini sudah tercapai.');
  }

  let session = db.prepare('SELECT * FROM quiz_sessions WHERE player_id=? AND module_id=? AND status=?').get(player.id, module.id, 'active');
  if (!session) {
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO quiz_sessions (id,player_id,module_id,status,current_difficulty,total_questions,correct_count,score,passed,started_at,duration_seconds)
      VALUES (?,?,?,?,?,?,?,?,?,?,0)`).run(id, player.id, module.id, 'active', 2, QUIZ_LENGTH, 0, 0, 0, new Date().toISOString());
    session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(id);
  }
  const answerIds = db.prepare('SELECT question_id FROM answers WHERE session_id=?').all(session.id).map((row) => row.question_id);
  const questions = db.prepare('SELECT * FROM questions WHERE module_id=?').all(module.id);
  const question = selectQuestion(questions, session.current_difficulty, answerIds);
  if (!question) throw new ApiError(404, 'NOT_FOUND', 'Belum ada soal untuk modul ini.');
  res.json({ sessionId: session.id, totalQuestions: session.total_questions, question: publicQuestion(question) });
});

router.post('/quizzes/:sessionId/answer', validate(answerSchema), (req, res) => {
  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(req.params.sessionId);
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Sesi kuis tidak ditemukan.');
  if (session.status !== 'active') throw new ApiError(409, 'CONFLICT', 'Sesi kuis sudah selesai.');
  assertPlayer(req, session.player_id);
  const duplicate = db.prepare('SELECT id FROM answers WHERE session_id=? AND question_id=?').get(session.id, req.body.questionId);
  if (duplicate) throw new ApiError(409, 'CONFLICT', 'Soal ini sudah dijawab.');
  const question = db.prepare('SELECT * FROM questions WHERE id=?').get(req.body.questionId);
  if (!question || question.module_id !== session.module_id) throw new ApiError(404, 'NOT_FOUND', 'Soal tidak ditemukan pada sesi ini.');
  const options = JSON.parse(question.options_json);
  if (req.body.chosenIndex >= options.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Pilihan jawaban tidak tersedia.', []);
  const isCorrect = req.body.chosenIndex === question.correct_index;
  db.prepare('INSERT INTO answers (id,session_id,question_id,chosen_index,is_correct,difficulty,answered_at) VALUES (?,?,?,?,?,?,?)')
    .run(crypto.randomUUID(), session.id, question.id, req.body.chosenIndex, isCorrect ? 1 : 0, question.difficulty, new Date().toISOString());
  const difficulty = nextDifficulty(session.current_difficulty, isCorrect);
  db.prepare('UPDATE quiz_sessions SET current_difficulty=?, correct_count=correct_count+? WHERE id=?')
    .run(difficulty, isCorrect ? 1 : 0, session.id);

  const answerCount = db.prepare('SELECT COUNT(*) AS count FROM answers WHERE session_id=?').get(session.id).count;
  let finished = false;
  let result = null;
  let nextQuestion = null;

  if (answerCount >= session.total_questions) {
    finished = true;
    result = finishSession(session.id);
  } else {
    const used = db.prepare('SELECT question_id FROM answers WHERE session_id=?').all(session.id).map((row) => row.question_id);
    const questions = db.prepare('SELECT * FROM questions WHERE module_id=?').all(session.module_id);
    const next = selectQuestion(questions, difficulty, used);
    if (next) nextQuestion = publicQuestion(next);
  }

  const response = {
    isCorrect, correctIndex: question.correct_index, explanation: question.explanation,
    finished,
    ...(nextQuestion ? { nextQuestion } : {}),
    ...(result ? { result } : {})
  };
  res.json(response);
});

router.get('/quizzes/:sessionId', (req, res) => {
  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(req.params.sessionId);
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Sesi kuis tidak ditemukan.');
  assertPlayer(req, session.player_id);
  res.json(session);
});

router.get('/players/:id/mastery', (req, res) => {
  assertPlayer(req, req.params.id);
  res.json(db.prepare('SELECT topic,score,attempts,updated_at FROM mastery WHERE player_id=? ORDER BY topic').all(req.params.id));
});

function finishSession(sessionId) {
  return db.transaction(() => {
    const session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(sessionId);
    const answerRows = db.prepare(`SELECT a.*, q.topic FROM answers a JOIN questions q ON q.id=a.question_id WHERE a.session_id=?`)
      .all(sessionId);
    const scoreResult = quizScore(answerRows);
    const finishedAt = new Date();
    const startedAt = new Date(session.started_at);
    const durationSeconds = Math.min(20 * 60, Math.max(0, Math.floor((finishedAt - startedAt) / 1000)));
    db.prepare('UPDATE quiz_sessions SET status=?,correct_count=?,score=?,passed=?,finished_at=?,duration_seconds=? WHERE id=?')
      .run('finished', answerRows.filter((row) => row.is_correct).length, scoreResult.score, scoreResult.passed ? 1 : 0, finishedAt.toISOString(), durationSeconds, sessionId);

    const topics = {};
    for (const row of answerRows) topics[row.topic] = (topics[row.topic] || 0) + 1;
    for (const topic of Object.keys(topics)) {
      const old = db.prepare('SELECT * FROM mastery WHERE player_id=? AND topic=?').get(session.player_id, topic);
      const masteryScore = updateMastery(old ? old.score : null, scoreResult.score);
      if (old) {
        db.prepare('UPDATE mastery SET score=?,attempts=attempts+1,updated_at=? WHERE player_id=? AND topic=?')
          .run(masteryScore, finishedAt.toISOString(), session.player_id, topic);
      } else {
        db.prepare('INSERT INTO mastery (player_id,topic,score,attempts,updated_at) VALUES (?,?,?,?,?)')
          .run(session.player_id, topic, masteryScore, 1, finishedAt.toISOString());
      }
    }

    let unlockedModuleId = null;
    if (scoreResult.passed) {
      db.prepare('UPDATE player_modules SET status=?,best_score=?,completed_at=? WHERE player_id=? AND module_id=?')
        .run('selesai', Math.max(db.prepare('SELECT best_score FROM player_modules WHERE player_id=? AND module_id=?').get(session.player_id, session.module_id).best_score, scoreResult.score),
          finishedAt.toISOString(), session.player_id, session.module_id);
      const module = db.prepare('SELECT * FROM modules WHERE id=?').get(session.module_id);
      const next = db.prepare(`SELECT m.* FROM modules m JOIN player_modules pm ON pm.module_id=m.id
        WHERE pm.player_id=? AND m.is_active=1 AND m.grade_min<=? AND m.grade_max>=? AND m.position>? ORDER BY m.position LIMIT 1`)
        .get(session.player_id, db.prepare('SELECT grade FROM players WHERE id=?').get(session.player_id).grade,
          db.prepare('SELECT grade FROM players WHERE id=?').get(session.player_id).grade, module.position);
      if (next) {
        db.prepare('UPDATE player_modules SET status=? WHERE player_id=? AND module_id=? AND status=?')
          .run('berjalan', session.player_id, next.id, 'terkunci');
        unlockedModuleId = next.id;
      }
      createMission(session.player_id, module, finishedAt);
    } else {
      db.prepare('UPDATE player_modules SET best_score=? WHERE player_id=? AND module_id=?')
        .run(Math.max(db.prepare('SELECT best_score FROM player_modules WHERE player_id=? AND module_id=?').get(session.player_id, session.module_id).best_score, scoreResult.score),
          session.player_id, session.module_id);
    }

    const points = pointsForQuiz(scoreResult.score, scoreResult.passed);
    db.prepare('INSERT INTO points_ledger (id,player_id,delta,reason,ref_id,created_at) VALUES (?,?,?,?,?,?)')
      .run(crypto.randomUUID(), session.player_id, points, 'quiz_completed', session.id, finishedAt.toISOString());
    evaluateBadges(session.player_id, scoreResult, session.module_id);
    const total = db.prepare('SELECT COALESCE(SUM(delta),0) AS points FROM points_ledger WHERE player_id=?').get(session.player_id).points;
    const level = levelFromPoints(total);
    const newBadges = db.prepare(`SELECT b.code FROM player_badges pb JOIN badges b ON b.id=pb.badge_id
      WHERE pb.player_id=? AND pb.earned_at=?`).all(session.player_id, finishedAt.toISOString()).map((row) => row.code);
    const mission = db.prepare('SELECT * FROM daily_missions WHERE player_id=? AND date=? LIMIT 1')
      .get(session.player_id, todayJakarta());
    return {
      score: scoreResult.score, passed: scoreResult.passed,
      correct: answerRows.filter((row) => row.is_correct).length, total: answerRows.length,
      pointsEarned: points, newBadges, level: level.level,
      unlockedModuleId, mission: mission || null
    };
  })();
}

function createMission(playerId, module, date) {
  const today = todayJakarta();
  const exists = db.prepare('SELECT id FROM daily_missions WHERE player_id=? AND module_id=? AND date=?').get(playerId, module.id, today);
  if (exists) return;
  const templates = {
    'air-putih': ['Misi Air Putih', 'Bawa air putih ke sekolah hari ini'],
    'minuman-manis': ['Detektif Gula', 'Pilih minuman tanpa gula tambahan hari ini'],
    'sayur-buah': ['Bintang Sayur dan Buah', 'Makan sayur di tiap makan hari ini']
  };
  const [title, description] = templates[module.topic] || ['Misi Gizi Sehat', 'Terapkan satu kebiasaan gizi sehat hari ini'];
  db.prepare('INSERT INTO daily_missions (id,player_id,module_id,date,title,description,status) VALUES (?,?,?,?,?,?,?)')
    .run(crypto.randomUUID(), playerId, module.id, today, title, description, 'pending');
}

function evaluateBadges(playerId, scoreResult, moduleId) {
  const quizCount = db.prepare(`SELECT COUNT(*) AS count FROM quiz_sessions WHERE player_id=? AND status='finished'`).get(playerId).count;
  const award = (code) => {
    const badge = db.prepare('SELECT * FROM badges WHERE code=?').get(code);
    if (!badge) return;
    if (!db.prepare('SELECT 1 FROM player_badges WHERE player_id=? AND badge_id=?').get(playerId, badge.id)) {
      db.prepare('INSERT INTO player_badges (player_id,badge_id,earned_at) VALUES (?,?,?)')
        .run(playerId, badge.id, new Date().toISOString());
    }
  };
  if (quizCount >= 1) award('first_quiz');
  if (scoreResult.score === 100) award('perfect_score');
  const module = db.prepare('SELECT topic FROM modules WHERE id=?').get(moduleId);
  if (scoreResult.passed && module.topic === 'air-putih') award('water_hero');
  if (scoreResult.passed && module.topic === 'minuman-manis') award('sugar_detective');
  if (scoreResult.passed && module.topic === 'sayur-buah') award('veggie_star');
  const completed = db.prepare(`SELECT COUNT(*) AS count FROM player_modules pm JOIN modules m ON m.id=pm.module_id
    WHERE pm.player_id=? AND pm.status='selesai'`).get(playerId).count;
  const total = db.prepare(`SELECT COUNT(*) AS count FROM modules m JOIN player_modules pm ON pm.module_id=m.id
    WHERE pm.player_id=? AND m.is_active=1`).get(playerId).count;
  if (completed === total && total > 0) award('all_modules');
  const totalPoints = db.prepare('SELECT COALESCE(SUM(delta),0) AS points FROM points_ledger WHERE player_id=?').get(playerId).points;
  if (totalPoints >= 500) award('level_5');
  const dates = db.prepare(`SELECT DISTINCT substr(started_at,1,10) AS date FROM quiz_sessions
    WHERE player_id=? AND status='finished' ORDER BY date`).all(playerId).map((row) => row.date);
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(`${dates[i - 1]}T00:00:00Z`);
    const cur = new Date(`${dates[i]}T00:00:00Z`);
    streak = (cur - prev) === 86400000 ? streak + 1 : 1;
  }
  if (streak >= 3) award('streak_3');
}

module.exports = router;
