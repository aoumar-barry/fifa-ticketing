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

// Register event listeners (side-effect imports)
require('./listeners/matchListener');

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

  // Start local SMTP Dev Server if configured for development
  let smtpServer = null;
  if (env.NODE_ENV === 'development' && (env.SMTP_HOST === '127.0.0.1' || env.SMTP_HOST === 'localhost')) {
    try {
      const { startSmtpDevServer } = require('./utils/smtpDevServer');
      smtpServer = startSmtpDevServer(env.SMTP_PORT || 1025);
    } catch (err) {
      logger.error({ err }, '[bootstrap] Failed to start local SMTP dev server');
    }
  }

  const app = createApp({ frontendUrl: env.FRONTEND_URL });

  const server = app.listen(env.PORT, () => {
    logger.info(`[server] FIFA Ticketing backend listening on :${env.PORT}`);
  });

  const shutdown = async (signal) => {
    logger.info(`[server] ${signal} received, closing...`);
    if (smtpServer) {
      try {
        const { stopSmtpDevServer } = require('./utils/smtpDevServer');
        stopSmtpDevServer();
      } catch (err) {
        logger.error({ err }, '[server] Failed to stop local SMTP dev server');
      }
    }
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
