const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const backupDir = '/data/backups';
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `aiko-${stamp}.db`);
db.backup(backupPath).then(() => {
  db.close();
  process.stdout.write(backupPath + '\n');
}).catch((error) => {
  db.close();
  process.stderr.write(`Backup gagal: ${error.message}\n`);
  process.exit(1);
});
