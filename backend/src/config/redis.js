const Redis = require('ioredis');

let client = null;

function createRedisClient({ url, logger } = {}) {
  if (!url) {
    throw new Error('Redis URL is required to create a Redis client');
  }

  let maskedUrl = url;
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '******';
    }
    maskedUrl = parsed.toString();
  } catch (err) {
    maskedUrl = url;
  }
  logger?.info(`[redis] Initializing connection to: ${maskedUrl}`);

  const c = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });

  c.on('connect', () => logger?.info('[redis] connecting...'));
  c.on('ready', () => logger?.info('[redis] ready'));
  c.on('error', (err) => logger?.error({ err }, '[redis] error'));
  c.on('end', () => logger?.warn('[redis] connection closed'));

  return c;
}

function setRedisClient(c) {
  client = c;
}

function getRedisClient() {
  if (!client) {
    throw new Error('Redis client not initialized. Call setRedisClient() first.');
  }
  return client;
}

async function pingRedis(c = client) {
  if (!c) throw new Error('No Redis client to ping');
  const pong = await c.ping();
  return pong === 'PONG';
}

async function disconnectRedis() {
  if (client) {
    await client.quit();
    client = null;
  }
}

module.exports = {
  createRedisClient,
  setRedisClient,
  getRedisClient,
  pingRedis,
  disconnectRedis,
};
