const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const db = require('./db');
const config = require('./config');
const { globalLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(pinoHttp());
app.use('/api', globalLimiter);

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      service: 'aiko-core',
      version: '1.0.0',
      uptime_s: Math.floor(process.uptime()),
      db: 'ok',
      time: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'aiko-core',
      version: '1.0.0',
      uptime_s: Math.floor(process.uptime()),
      db: 'error',
      time: new Date().toISOString()
    });
  }
});

const openapiCandidates = [
  path.join(__dirname, '../../docs/openapi.yaml'),
  path.join(process.cwd(), 'docs/openapi.yaml')
];
const openapiPath = openapiCandidates.find((candidate) => fs.existsSync(candidate));
const openapiText = openapiPath
  ? fs.readFileSync(openapiPath, 'utf8')
  : YAML.stringify({
      openapi: '3.0.3',
      info: { title: 'LiterasiGizi Service (aiko)', version: '1.0.0' },
      paths: {}
    });
const openapiDoc = YAML.parse(openapiText);

app.get('/api/openapi.yaml', (req, res) => res.type('application/yaml').send(openapiText));
app.get('/api/docs', (req, res) => res.type('html').send(swaggerUi.generateHTML(openapiDoc)));
app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs/', swaggerUi.setup(openapiDoc));

app.use('/api/auth', require('./modules/auth/routes'));
app.use('/api/players', require('./modules/profile/routes'));
app.use('/api/modules', require('./modules/content/routes'));
app.use('/api/topics', require('./modules/content/topicRoutes'));
app.use('/api', require('./modules/learning/routes'));
app.use('/api', require('./modules/progress/routes'));
app.use('/api/open', require('./modules/open/routes'));
app.use('/api/admin', require('./modules/admin/routes'));

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan.', details: [] } });
});
app.use(errorHandler);

module.exports = app;
