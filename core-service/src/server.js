const app = require('./app');
const config = require('./config');
const db = require('./db');

const server = app.listen(config.PORT, '0.0.0.0', () => {
  process.stdout.write(`Aiko core mendengarkan pada port ${config.PORT}\n`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
