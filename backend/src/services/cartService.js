const { Match, Seat, Cart } = require('../models');
const { lockSeat, unlockSeat } = require('./seatLockService');
const { AppError } = require('./authService');

const CART_TTL_MS = 600_000; // 10 minutes

/**
 * Create a new cart with a single seat reservation.
 *
 * 1. Verify match exists and is active
 * 2. Verify seat exists and is available
 * 3. Acquire Redis lock (NX EX 600)
 * 4. Mark Seat.status → locked
 * 5. Create Cart document with expiresAt
 * 6. Decrement Match.availableSeats
 *
 * @param {string} userId
 * @param {string} matchId
 * @param {string} seatId
 * @returns {Promise<{cartId: string, expiresAt: Date}>}
 */
async function createCart(userId, matchId, seatId) {
  // 1. Match exists and is active
  const match = await Match.findById(matchId);
  if (!match || !match.isActive) {
    throw new AppError(404, 'Match introuvable ou inactif', 'NOT_FOUND');
  }

  // 2. Seat exists and is available
  const seat = await Seat.findById(seatId);
  if (!seat) {
    throw new AppError(404, 'Siège introuvable', 'NOT_FOUND');
  }
  if (seat.status !== 'available') {
    throw new AppError(409, 'Siège déjà réservé', 'SEAT_LOCKED');
  }

  // 3. Acquire distributed lock (throws 409 if already locked)
  await lockSeat(seatId, userId);

  try {
    // 4. Mark seat as locked in DB
    seat.status = 'locked';
    await seat.save();

    // 5. Create Cart
    const expiresAt = new Date(Date.now() + CART_TTL_MS);
    const cart = await Cart.create({
      userId,
      expiresAt,
      status: 'active',
      items: [
        {
          matchId,
          seatId,
          price: seat.price,
        },
      ],
    });

    // 6. Decrement available seats
    await Match.findByIdAndUpdate(matchId, { $inc: { availableSeats: -1 } });

    return {
      cartId: cart._id.toString(),
      expiresAt: cart.expiresAt,
    };
  } catch (err) {
    // Rollback: release the Redis lock if Cart creation fails
    await unlockSeat(seatId).catch(() => {});
    throw err;
  }
}

/**
 * Retrieve an active cart by ID, checking ownership.
 *
 * @param {string} cartId
 * @param {string} userId
 * @returns {Promise<object>} Cart document
 */
async function getCart(cartId, userId) {
  const cart = await Cart.findById(cartId);

  if (!cart) {
    throw new AppError(404, 'Panier introuvable', 'NOT_FOUND');
  }
  if (cart.userId.toString() !== userId) {
    throw new AppError(403, 'Accès refusé', 'FORBIDDEN');
  }

  return cart;
}

/**
 * Delete (cancel) a cart and release all seat locks.
 *
 * 1. Find cart and verify ownership
 * 2. Unlock each seat in Redis + mark Seat.status → available
 * 3. Increment Match.availableSeats
 * 4. Delete the Cart document
 *
 * @param {string} cartId
 * @param {string} userId
 */
async function deleteCart(cartId, userId) {
  const cart = await Cart.findById(cartId);

  if (!cart) {
    throw new AppError(404, 'Panier introuvable', 'NOT_FOUND');
  }
  if (cart.userId.toString() !== userId) {
    throw new AppError(403, 'Accès refusé', 'FORBIDDEN');
  }
  if (cart.status !== 'active') {
    throw new AppError(400, 'Ce panier ne peut plus être annulé', 'BAD_REQUEST');
  }

  // Release each seat
  for (const item of cart.items) {
    await unlockSeat(item.seatId.toString()).catch(() => {});
    await Seat.findByIdAndUpdate(item.seatId, { status: 'available' }).catch(() => {});
    await Match.findByIdAndUpdate(item.matchId, { $inc: { availableSeats: 1 } }).catch(() => {});
  }

  // Remove the cart
  await Cart.findByIdAndDelete(cartId);
}

module.exports = {
  createCart,
  getCart,
  deleteCart,
  CART_TTL_MS,
};
