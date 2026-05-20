const { loadEnv } = require('../../config/env');

describe('config/env — loadEnv', () => {
  it('loads defaults in development', () => {
    const env = loadEnv({ NODE_ENV: 'development' });
    expect(env.PORT).toBe(3000);
    expect(env.FRONTEND_URL).toBe('http://localhost:5173');
    expect(env.COSMOS_DB_NAME).toBe('fifa-ticketing');
  });

  it('coerces PORT from string to number', () => {
    const env = loadEnv({ NODE_ENV: 'development', PORT: '4000' });
    expect(env.PORT).toBe(4000);
  });

  it('rejects invalid FRONTEND_URL', () => {
    expect(() => loadEnv({ NODE_ENV: 'development', FRONTEND_URL: 'not-a-url' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('rejects production without required secrets', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(
      /Missing required env vars in production/,
    );
  });

  it('accepts production when all required secrets are set', () => {
    const env = loadEnv({
      NODE_ENV: 'production',
      COSMOS_CONNECTION_STRING: 'mongodb://x',
      UPSTASH_REDIS_URL: 'rediss://x',
      JWT_ACCESS_SECRET: 'a',
      JWT_REFRESH_SECRET: 'b',
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
    });
    expect(env.NODE_ENV).toBe('production');
  });
});
