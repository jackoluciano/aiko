process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const db = require('../src/db');

db.exec(fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8'));
const app = require('../src/app');

afterAll(() => db.close());

test('GET /api/docs dapat diakses tanpa token', async () => {
  const response = await request(app).get('/api/docs');
  expect(response.status).toBe(200);
  expect(response.text).toContain('Swagger UI');
});

test('GET /api/docs/ dapat diakses tanpa token', async () => {
  const response = await request(app).get('/api/docs/');
  expect(response.status).toBe(200);
});

test('GET /api/openapi.yaml dapat diakses tanpa token', async () => {
  const response = await request(app).get('/api/openapi.yaml');
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toContain('application/yaml');
});

test('GET /api/modules tanpa token tetap 401', async () => {
  const response = await request(app).get('/api/modules');
  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe('UNAUTHORIZED');
});
