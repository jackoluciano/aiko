PRAGMA foreign_keys=ON;
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('parent','admin')),
  consent_given INTEGER NOT NULL DEFAULT 0 CHECK(consent_given IN (0,1)),
  consent_at TEXT,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 6),
  daily_limit_minutes INTEGER NOT NULL DEFAULT 15 CHECK(daily_limit_minutes BETWEEN 5 AND 60),
  avatar TEXT,
  share_progress INTEGER NOT NULL DEFAULT 0 CHECK(share_progress IN (0,1)),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  grade_min INTEGER NOT NULL CHECK(grade_min BETWEEN 1 AND 6),
  grade_max INTEGER NOT NULL CHECK(grade_max BETWEEN 1 AND 6),
  position INTEGER NOT NULL,
  summary TEXT NOT NULL,
  content_md TEXT NOT NULL,
  source_ref TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))
) STRICT;

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 3),
  explanation TEXT NOT NULL,
  image_url TEXT,
  source TEXT NOT NULL DEFAULT 'bank' CHECK(source IN ('bank','food_card'))
) STRICT;

CREATE TABLE IF NOT EXISTS player_modules (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'terkunci' CHECK(status IN ('terkunci','berjalan','selesai')),
  best_score INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY (player_id, module_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished','abandoned')),
  current_difficulty INTEGER NOT NULL DEFAULT 2,
  total_questions INTEGER NOT NULL DEFAULT 8,
  correct_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0 CHECK(passed IN (0,1)),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id),
  chosen_index INTEGER NOT NULL,
  is_correct INTEGER NOT NULL CHECK(is_correct IN (0,1)),
  difficulty INTEGER NOT NULL,
  answered_at TEXT NOT NULL,
  UNIQUE(session_id, question_id)
) STRICT;

CREATE TABLE IF NOT EXISTS mastery (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, topic)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS points_ledger (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_id TEXT,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  rule_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS player_badges (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TEXT NOT NULL,
  PRIMARY KEY (player_id, badge_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS daily_missions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','checked')),
  checked_by TEXT REFERENCES users(id),
  checked_at TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  group_name TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  request_count INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE IF NOT EXISTS api_call_log (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
