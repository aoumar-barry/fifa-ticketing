require('dotenv').config();

// Mock firebase-admin before any imports
jest.mock('firebase-admin', () => {
  const mockAuth = {
    verifyIdToken: jest.fn(),
  };
  return {
    credential: { cert: jest.fn() },
    initializeApp: jest.fn(),
    auth: () => mockAuth,
  };
});

// Ensure JWT secrets are available
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'local_access_secret_key_fifa_2026_xyz';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'local_refresh_secret_key_fifa_2026_abc';
}

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../app');
const { User, Match, Stadium, Seat, Cart } = require('../../models');
const { _internals: lockInternals } = require('../../services/seatLockService');

jest.setTimeout(120000);

describe('Cart integration tests', () => {
  let mongod;
  let app;
  let accessToken;
  let user;
  let stadium;
  let match;
  let seat;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-cart-test' });

    await Promise.all([
      User.syncIndexes(),
      Stadium.syncIndexes(),
      Match.syncIndexes(),
      Seat.syncIndexes(),
      Cart.syncIndexes(),
    ]);

    app = createApp({ frontendUrl: 'http://localhost:5173' });
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    // Clear data
    await Promise.all([
      User.deleteMany({}),
      Stadium.deleteMany({}),
      Match.deleteMany({}),
      Seat.deleteMany({}),
      Cart.deleteMany({}),
    ]);

    // Clear in-memory seat locks
    lockInternals.memoryStore.clear();
    for (const timer of lockInternals.memoryTimers.values()) {
      clearTimeout(timer);
    }
    lockInternals.memoryTimers.clear();

    // Create a test user
    user = await User.create({
      email: 'testcart@example.com',
      passwordHash: '$2b$10$dummyHashForTestingOnly1234567890abcd',
      firstName: 'Test',
      lastName: 'User',
      isVerified: true,
      role: 'user',
    });

    // Generate a valid access token
    accessToken = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    );

    // Create a test stadium
    stadium = await Stadium.create({
      name: 'MetLife Stadium',
      city: 'East Rutherford',
      country: 'USA',
      capacity: 82500,
    });

    // Create a test match
    match = await Match.create({
      teamA: 'France',
      teamB: 'Brazil',
      round: 'final',
      date: new Date('2026-07-19T18:00:00Z'),
      stadiumId: stadium._id,
      totalSeats: 100,
      availableSeats: 100,
      isActive: true,
    });

    // Create a test seat
    seat = await Seat.create({
      stadiumId: stadium._id,
      section: 'A',
      row: '1',
      number: 1,
      category: 'A',
      price: 150,
      status: 'available',
    });
  });

  // ---------------------------------------------------------------
  // TC-CART-001 — Création panier (cas nominal)
  // ---------------------------------------------------------------
  describe('POST /api/v1/cart — création panier', () => {
    it('should create a cart and lock the seat (201)', async () => {
      const res = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ matchId: match._id.toString(), seatId: seat._id.toString() })
        .expect(201);

      expect(res.body.cartId).toBeDefined();
      expect(res.body.expiresAt).toBeDefined();

      // Verify seat is now locked in DB
      const updatedSeat = await Seat.findById(seat._id);
      expect(updatedSeat.status).toBe('locked');

      // Verify match availableSeats decremented
      const updatedMatch = await Match.findById(match._id);
      expect(updatedMatch.availableSeats).toBe(99);

      // Verify Cart document exists
      const cart = await Cart.findById(res.body.cartId);
      expect(cart).not.toBeNull();
      expect(cart.status).toBe('active');
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].price).toBe(150);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/cart')
        .send({ matchId: match._id.toString(), seatId: seat._id.toString() })
        .expect(401);
    });

    it('should return 400 with missing fields', async () => {
      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent match', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ matchId: fakeId, seatId: seat._id.toString() })
        .expect(404);
    });

    it('should return 404 for inactive match', async () => {
      match.isActive = false;
      await match.save();

      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ matchId: match._id.toString(), seatId: seat._id.toString() })
        .expect(404);
    });
  });

  // ---------------------------------------------------------------
  // TC-CART-002 — Siège déjà pris
  // ---------------------------------------------------------------
  describe('POST /api/v1/cart — siège déjà locké', () => {
    it('should return 409 when the seat is already locked', async () => {
      // First reservation — success
      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ matchId: match._id.toString(), seatId: seat._id.toString() })
        .expect(201);

      // Create a second user
      const user2 = await User.create({
        email: 'other@example.com',
        passwordHash: '$2b$10$dummyHashForTestingOnly1234567890abcd',
        firstName: 'Other',
        lastName: 'User',
        isVerified: true,
        role: 'user',
      });
      const token2 = jwt.sign(
        { userId: user2._id, role: user2.role, email: user2.email },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );

      // Second reservation on same seat — conflict
      const res = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token2}`)
        .send({ matchId: match._id.toString(), seatId: seat._id.toString() })
        .expect(409);

      expect(res.body.error.code).toBe('SEAT_LOCKED');
    });
  });

  // ---------------------------------------------------------------
  // TC-CART-003 — Annulation panier
  // ---------------------------------------------------------------
  describe('DELETE /api/v1/cart/:id — annulation', () => {
    it('should delete the cart and release the seat lock (200)', async () => {
      // Create cart first
      const createRes = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ matchId: match._id.toString(), seatId: seat._id.toString() })
        .expect(201);

      const cartId = createRes.body.cartId;

      // Delete the cart
      await request(app)
        .delete(`/api/v1/cart/${cartId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify seat is available again
      const updatedSeat = await Seat.findById(seat._id);
      expect(updatedSeat.status).toBe('available');

      // Verify match availableSeats restored
      const updatedMatch = await Match.findById(match._id);
      expect(updatedMatch.availableSeats).toBe(100);

      // Verify Cart is deleted
      const cart = await Cart.findById(cartId);
      expect(cart).toBeNull();
    });

    it('should return 403 when deleting another user\'s cart', async () => {
      // Create cart
      const createRes = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ matchId: match._id.toString(), seatId: seat._id.toString() })
        .expect(201);

      // Create another user
      const user2 = await User.create({
        email: 'intruder@example.com',
        passwordHash: '$2b$10$dummyHashForTestingOnly1234567890abcd',
        firstName: 'Intruder',
        lastName: 'User',
        isVerified: true,
        role: 'user',
      });
      const token2 = jwt.sign(
        { userId: user2._id, role: user2.role, email: user2.email },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );

      await request(app)
        .delete(`/api/v1/cart/${createRes.body.cartId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);
    });

    it('should return 404 for non-existent cart', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .delete(`/api/v1/cart/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ---------------------------------------------------------------
  // GET /api/v1/cart/:id
  // ---------------------------------------------------------------
  describe('GET /api/v1/cart/:id', () => {
    it('should return the cart for the owner', async () => {
      const createRes = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ matchId: match._id.toString(), seatId: seat._id.toString() })
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/cart/${createRes.body.cartId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body._id).toBe(createRes.body.cartId);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.status).toBe('active');
    });

    it('should return 403 for a different user', async () => {
      const createRes = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ matchId: match._id.toString(), seatId: seat._id.toString() })
        .expect(201);

      const user2 = await User.create({
        email: 'spy@example.com',
        passwordHash: '$2b$10$dummyHashForTestingOnly1234567890abcd',
        firstName: 'Spy',
        lastName: 'User',
        isVerified: true,
        role: 'user',
      });
      const token2 = jwt.sign(
        { userId: user2._id, role: user2.role, email: user2.email },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );

      await request(app)
        .get(`/api/v1/cart/${createRes.body.cartId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);
    });
  });
});
