const request = require('supertest');
const { createApp } = require('../../app');

describe('GET /health', () => {
  const app = createApp({ frontendUrl: 'http://localhost:5173' });

  it('returns 200 with service info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'fifa-ticketing-backend',
    });
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.db).toBe('string');
  });

  it('reports db status (disconnected when no DB)', async () => {
    const res = await request(app).get('/health');
    expect(['disconnected', 'connected', 'connecting']).toContain(res.body.db);
  });
});

describe('Unknown route', () => {
  const app = createApp({ frontendUrl: 'http://localhost:5173' });

  it('returns 404 with unified error format', async () => {
    const res = await request(app).get('/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});
