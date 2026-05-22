require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { Stadium, Match, Seat, Cart } = require('../../models');
const { createCart, getCart, deleteCart } = require('../../services/cartService');
const { _internals: lockInternals, isLocked } = require('../../services/seatLockService');

jest.setTimeout(120000);

describe('cartService Unit Tests', () => {
  let mongod;
  let userId;
  let stadiumId;
  let matchId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-unit-cart' });
    await Promise.all([
      Stadium.syncIndexes(),
      Match.syncIndexes(),
      Seat.syncIndexes(),
      Cart.syncIndexes(),
    ]);
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId().toString();

    const stadium = await Stadium.create({
      name: 'Stade de France',
      city: 'Saint-Denis',
      country: 'France',
      capacity: 80000,
    });
    stadiumId = stadium._id.toString();

    const match = await Match.create({
      teamA: 'France',
      teamB: 'Brazil',
      round: 'final',
      stadiumId,
      totalSeats: 10,
      availableSeats: 10,
      date: new Date(),
      isActive: true,
    });
    matchId = match._id.toString();

    // Clear seat locks
    lockInternals.memoryStore.clear();
    for (const timer of lockInternals.memoryTimers.values()) {
      clearTimeout(timer);
    }
    lockInternals.memoryTimers.clear();
  });

  afterEach(async () => {
    await Promise.all([
      Stadium.deleteMany({}),
      Match.deleteMany({}),
      Seat.deleteMany({}),
      Cart.deleteMany({}),
    ]);
    jest.restoreAllMocks();
  });

  describe('createCart', () => {
    it('throws AppError 404 if seat is not found', async () => {
      const nonExistentSeatId = new mongoose.Types.ObjectId().toString();
      await expect(createCart(userId, matchId, nonExistentSeatId)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Siège introuvable',
      });
    });

    it('triggers rollback and unlocks seat if Cart creation fails', async () => {
      const seat = await Seat.create({
        stadiumId,
        matchId,
        category: 'A',
        section: 'A1',
        row: '1',
        number: 123,
        price: 100,
        status: 'available',
      });
      const seatId = seat._id.toString();

      // Spy on Cart.create and force it to reject
      jest.spyOn(Cart, 'create').mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(createCart(userId, matchId, seatId)).rejects.toThrow('DB connection lost');

      // Verify that lock was released in seatLockService
      expect(await isLocked(seatId)).toBeNull();
    });

    it('triggers rollback and handles unlockSeat failure during Cart creation rollback', async () => {
      const seat = await Seat.create({
        stadiumId,
        matchId,
        category: 'A',
        section: 'A1',
        row: '1',
        number: 124,
        price: 100,
        status: 'available',
      });
      const seatId = seat._id.toString();

      jest.spyOn(Cart, 'create').mockRejectedValueOnce(new Error('DB connection lost'));
      
      const seatLockService = require('../../services/seatLockService');
      jest.spyOn(seatLockService, 'unlockSeat').mockRejectedValueOnce(new Error('Redis failure'));

      await expect(createCart(userId, matchId, seatId)).rejects.toThrow('DB connection lost');
    });
  });

  describe('getCart', () => {
    it('throws AppError 404 if cart is not found', async () => {
      const nonExistentCartId = new mongoose.Types.ObjectId().toString();
      await expect(getCart(nonExistentCartId, userId)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Panier introuvable',
      });
    });
  });

  describe('deleteCart', () => {
    it('throws AppError 400 if cart is not active', async () => {
      const seat = await Seat.create({
        stadiumId,
        matchId,
        category: 'A',
        section: 'A1',
        row: '1',
        number: 456,
        price: 100,
        status: 'locked',
      });

      const cart = await Cart.create({
        userId,
        expiresAt: new Date(Date.now() + 60000),
        status: 'confirmed', // not active
        items: [
          {
            matchId,
            seatId: seat._id,
            price: 100,
          },
        ],
      });

      await expect(deleteCart(cart._id.toString(), userId)).rejects.toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Ce panier ne peut plus être annulé',
      });
    });

    it('catches and ignores failures during seat release in deleteCart', async () => {
      const seat = await Seat.create({
        stadiumId,
        matchId,
        category: 'A',
        section: 'A1',
        row: '1',
        number: 789,
        price: 100,
        status: 'locked',
      });

      const cart = await Cart.create({
        userId,
        expiresAt: new Date(Date.now() + 60000),
        status: 'active',
        items: [
          {
            matchId,
            seatId: seat._id,
            price: 100,
          },
        ],
      });

      const seatLockService = require('../../services/seatLockService');
      jest.spyOn(seatLockService, 'unlockSeat').mockRejectedValueOnce(new Error('Redis failure'));
      jest.spyOn(Seat, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('DB failure 1'));
      jest.spyOn(Match, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('DB failure 2'));

      await expect(deleteCart(cart._id.toString(), userId)).resolves.not.toThrow();

      // Verify that the cart was still deleted
      const deletedCart = await Cart.findById(cart._id);
      expect(deletedCart).toBeNull();
    });
  });
});
