const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const roadmapsService = require('../src/modules/roadmaps/roadmaps.service');

let server;
let baseUrl;
test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => new Promise((resolve) => server.close(resolve)));

const authHeaders = () => ({
  authorization: `Bearer ${jwt.sign(
    { id: '10000000-0000-4000-8000-000000000001', role: 'user' },
    process.env.JWT_SECRET || 'dev-secret',
  )}`,
  'content-type': 'application/json',
});

test('generate HTTP contract exposes reused state with 200 and new state with 201', async () => {
  roadmapsService.generateRoadmap = async () => ({
    hasRoadmap: true, requiredAction: null, reused: true, roadmap: { id: 'r1' },
  });
  let response = await fetch(`${baseUrl}/api/v1/roadmaps/generate`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({}),
  });
  let body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.reused, true);
  assert.equal(body.data.hasRoadmap, true);

  roadmapsService.generateRoadmap = async () => ({
    hasRoadmap: true, requiredAction: null, reused: false, roadmap: { id: 'r2' },
  });
  response = await fetch(`${baseUrl}/api/v1/roadmaps/generate`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({}),
  });
  body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.data.reused, false);
  assert.equal(body.data.requiredAction, null);
});
