const { getRedisClient } = require('../config/redis');
const { AppError } = require('./authService');

const LOCK_TTL = 600; // 10 minutes in seconds

// ---------------------------------------------------------------------------
// In-memory fallback (dev only, single-process)
// ---------------------------------------------------------------------------
const memoryStore = new Map();
const memoryTimers = new Map();

function memLock(key, value) {
  if (memoryStore.has(key)) return null; // NX semantics
  memoryStore.set(key, value);
  const timer = setTimeout(() => {
    memoryStore.delete(key);
    memoryTimers.delete(key);
  }, LOCK_TTL * 1000);
  timer.unref(); // don't prevent process exit
  memoryTimers.set(key, timer);
  return 'OK';
}

function memDel(key) {
  memoryStore.delete(key);
  const timer = memoryTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    memoryTimers.delete(key);
  }
}

function memGet(key) {
  return memoryStore.get(key) || null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRedisAvailable() {
  try {
    getRedisClient();
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Acquire a distributed lock on a seat.
 *
 * @param {string} seatId  Mongoose ObjectId as string
 * @param {string} userId  Mongoose ObjectId as string
 * @returns {Promise<boolean>} true when the lock is acquired
 * @throws {AppError} 409 when the seat is already locked by another user
 */
async function lockSeat(seatId, userId) {
  const key = `seat:${seatId}`;

  let result;

  if (isRedisAvailable()) {
    const redis = getRedisClient();
    // SET key value NX EX 600 — atomic lock
    result = await redis.set(key, userId, 'EX', LOCK_TTL, 'NX');
  } else {
    result = memLock(key, userId);
  }

  if (!result) {
    throw new AppError(409, 'Siège déjà réservé', 'SEAT_LOCKED');
  }

  return true;
}

/**
 * Release the lock on a seat.
 *
 * @param {string} seatId
 * @returns {Promise<void>}
 */
async function unlockSeat(seatId) {
  const key = `seat:${seatId}`;

  if (isRedisAvailable()) {
    const redis = getRedisClient();
    await redis.del(key);
  } else {
    memDel(key);
  }
}

/**
 * Check whether a seat is currently locked.
 *
 * @param {string} seatId
 * @returns {Promise<string|null>} userId of the lock holder, or null
 */
async function isLocked(seatId) {
  const key = `seat:${seatId}`;

  if (isRedisAvailable()) {
    const redis = getRedisClient();
    return await redis.get(key);
  }

  return memGet(key);
}

// Expose internals for testing only
const _internals = { memoryStore, memoryTimers, LOCK_TTL };

module.exports = {
  lockSeat,
  unlockSeat,
  isLocked,
  LOCK_TTL,
  _internals,
};
