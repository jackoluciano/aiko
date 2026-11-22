const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

db.exec(fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8'));
const revoke = process.argv.includes('--revoke');
const groupName = process.argv.find((arg) => arg !== '--revoke' && arg !== process.argv[1]);

if (!groupName) {
  process.stderr.write('Gunakan: node scripts/create-api-key.js <nama_kelompok>\n');
  process.exit(1);
}
if (revoke) {
  const result = db.prepare('UPDATE api_keys SET active=0 WHERE group_name=?').run(groupName);
  if (!result.changes) process.stderr.write('Kelompok tidak ditemukan\n');
  else process.stdout.write(`API key untuk ${groupName} dicabut\n`);
} else {
  const existing = db.prepare('SELECT id FROM api_keys WHERE group_name=?').get(groupName);
  if (existing) {
    process.stderr.write('Kelompok sudah memiliki API key. Gunakan --revoke dahulu untuk mencabut.\n');
    process.exit(1);
  }
  const raw = `aiko_${crypto.randomBytes(24).toString('hex')}`;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO api_keys (id,group_name,key_hash,prefix,active,created_at,request_count) VALUES (?,?,?,?,?,?,0)')
    .run(id, groupName, crypto.createHash('sha256').update(raw).digest('hex'), raw.slice(0,8), 1, new Date().toISOString());
  process.stdout.write(`API_KEY=${raw}\n`);
}
db.close();
