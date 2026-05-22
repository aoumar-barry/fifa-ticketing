require('dotenv').config();

const { loadEnv } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const {
  createRedisClient,
  setRedisClient,
  pingRedis,
  disconnectRedis,
} = require('./config/redis');
const { logger } = require('./utils/logger');
const { createApp } = require('./app');

async function bootstrap() {
  const env = loadEnv();

  if (env.COSMOS_CONNECTION_STRING) {
    await connectDB({
      uri: env.COSMOS_CONNECTION_STRING,
      dbName: env.COSMOS_DB_NAME,
      logger,
    });
  } else {
    logger.warn('[bootstrap] COSMOS_CONNECTION_STRING missing — DB disabled (dev only)');
  }

  const redisUrl = env.REDIS_URL || env.UPSTASH_REDIS_URL;
  if (redisUrl) {
    const redis = createRedisClient({ url: redisUrl, logger });
    setRedisClient(redis);
    const ok = await pingRedis(redis);
    logger.info({ pong: ok }, '[bootstrap] redis ping');
  } else {
    logger.warn('[bootstrap] Redis URL missing — Redis disabled (dev only)');
  }

  const app = createApp({ frontendUrl: env.FRONTEND_URL });

  const server = app.listen(env.PORT, () => {
    logger.info(`[server] FIFA Ticketing backend listening on :${env.PORT}`);
  });

  const shutdown = async (signal) => {
    logger.info(`[server] ${signal} received, closing...`);
    server.close(async () => {
      await disconnectDB().catch(() => {});
      await disconnectRedis().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, '[bootstrap] failed to start');
  process.exit(1);
});
