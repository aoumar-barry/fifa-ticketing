const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  COSMOS_CONNECTION_STRING: z.string().min(1).optional(),
  COSMOS_DB_NAME: z.string().min(1).default('fifa-ticketing'),

  REDIS_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_TOKEN: z.string().min(1).optional(),

  JWT_ACCESS_SECRET: z.string().min(1).optional(),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),

  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),

  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),

  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1).optional(),
  AZURE_CONTAINER_NAME: z.string().min(1).default('tickets'),

  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1).optional(),
});

// On exige les secrets critiques uniquement en production.
// En dev/test, on tolère leur absence pour faciliter le bootstrap.
function loadEnv(raw = process.env) {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    const required = [
      'COSMOS_CONNECTION_STRING',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ];
    const missing = required.filter((k) => !env[k]);
    if (!env.REDIS_URL && !env.UPSTASH_REDIS_URL) {
      missing.push('REDIS_URL (or UPSTASH_REDIS_URL)');
    }
    if (missing.length) {
      throw new Error(
        `Missing required env vars in production: ${missing.join(', ')}`,
      );
    }
  }

  return env;
}

module.exports = { loadEnv, envSchema };
