const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const coursesService = require('../src/modules/courses/courses.service');

let server;
let baseUrl;
test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => new Promise((resolve) => server.close(resolve)));

const token = (role = 'user') => jwt.sign(
  { id: '10000000-0000-4000-8000-000000000001', role },
  process.env.JWT_SECRET || 'dev-secret',
);
const auth = (role) => ({ authorization: `Bearer ${token(role)}`, 'content-type': 'application/json' });

test('all course routes require authentication and return stable errors', async () => {
  const response = await fetch(`${baseUrl}/api/v1/courses`);
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'UNAUTHORIZED');
  assert.deepEqual(body.error.details, []);
});

test('admin import routes reject ordinary users before service execution', async () => {
  const response = await fetch(`${baseUrl}/api/v1/courses/import/preview`, {
    method: 'POST', headers: auth('user'),
    body: JSON.stringify({ url: 'https://maharatech.gov.eg/mod/page/view.php?id=42' }),
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'FORBIDDEN');
});

test('fixed saved route is matched before the UUID detail route', async () => {
  coursesService.getSavedCourses = async () => ({
    courses: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
  });
  const response = await fetch(`${baseUrl}/api/v1/courses/saved`, { headers: auth() });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.data.courses, []);
  assert.equal(body.meta.pagination.page, 1);
});

test('save status codes distinguish newly created and idempotent cases', async () => {
  const id = '20000000-0000-4000-8000-000000000001';
  coursesService.saveCourse = async () => ({ courseId: id, isSaved: true, alreadySaved: false });
  let response = await fetch(`${baseUrl}/api/v1/courses/${id}/save`, { method: 'POST', headers: auth() });
  assert.equal(response.status, 201);
  coursesService.saveCourse = async () => ({ courseId: id, isSaved: true, alreadySaved: true });
  response = await fetch(`${baseUrl}/api/v1/courses/${id}/save`, { method: 'POST', headers: auth() });
  assert.equal(response.status, 200);
});

test('invalid UUIDs use the validation error envelope', async () => {
  const response = await fetch(`${baseUrl}/api/v1/courses/not-a-uuid`, { headers: auth() });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.ok(body.error.details.length > 0);
});
