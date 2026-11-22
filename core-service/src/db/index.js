const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const dbPath = config.DB_PATH;
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

module.exports = db;
