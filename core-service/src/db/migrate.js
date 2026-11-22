const fs = require('fs');
const path = require('path');
const db = require('./index');

try {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  process.stdout.write('Migrasi database selesai\n');
} finally {
  db.close();
}
