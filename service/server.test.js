const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { once } = require('node:events');
const { createApp } = require('./server');

const listen = async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  return request(server);
};

test('health endpoint returns env metadata', async (t) => {
  const agent = await listen(t);
  const res = await agent.get('/healthz');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.ok(res.body.version);
});

test('checkout endpoint creates orders', async (t) => {
  const agent = await listen(t);
  const res = await agent
    .post('/api/checkout')
    .send({ items: ['sku-1', 'sku-2'], total: 42.5 });
  assert.equal(res.status, 201);
  assert.ok(res.body.id.startsWith('ord_'));
  const list = await agent.get('/api/orders');
  assert.ok(list.body.some((order) => order.id === res.body.id));
});

test('checkout validates payloads', async (t) => {
  const agent = await listen(t);
  const res = await agent.post('/api/checkout').send({ items: 'nope' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Invalid payload');
});
