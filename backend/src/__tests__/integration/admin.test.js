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

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../app');
const { User, Match, Stadium, Seat, Ticket } = require('../../models');
const { setRedisClient } = require('../../config/redis');

describe('Admin CRUD Matches integration tests', () => {
  let mongod;
  let app;
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;
  let stadium1;
  let stadium2;
  let mockRedis;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-admin-test' });

    await Promise.all([
      User.syncIndexes(),
      Stadium.syncIndexes(),
      Match.syncIndexes(),
      Seat.syncIndexes(),
      Ticket.syncIndexes(),
    ]);

    // Mock Redis
    mockRedis = {
      mget: jest.fn().mockResolvedValue([]),
    };
    setRedisClient(mockRedis);

    app = createApp({ frontendUrl: 'http://localhost:5173' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    // Clear collections
    await Promise.all([
      User.deleteMany({}),
      Stadium.deleteMany({}),
      Match.deleteMany({}),
      Seat.deleteMany({}),
      Ticket.deleteMany({}),
    ]);

    // Create users
    adminUser = await User.create({
      email: 'admin@fifa.com',
      passwordHash: 'dummyHash',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isVerified: true,
    });

    regularUser = await User.create({
      email: 'user@fifa.com',
      passwordHash: 'dummyHash',
      firstName: 'Regular',
      lastName: 'User',
      role: 'user',
      isVerified: true,
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser._id, role: adminUser.role, email: adminUser.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    userToken = jwt.sign(
      { userId: regularUser._id, role: regularUser.role, email: regularUser.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Create test stadiums
    stadium1 = await Stadium.create({
      name: 'Mercedes-Benz Stadium',
      city: 'Atlanta',
      country: 'USA',
      capacity: 71000,
    });

    stadium2 = await Stadium.create({
      name: 'Gillette Stadium',
      city: 'Boston',
      country: 'USA',
      capacity: 65878,
    });

    // Create physical seats for Stadium 1 (3 seats)
    await Seat.create([
      { stadiumId: stadium1._id, section: 'A1', row: 'A', number: 1, category: 'A', price: 150 },
      { stadiumId: stadium1._id, section: 'A1', row: 'A', number: 2, category: 'A', price: 150 },
      { stadiumId: stadium1._id, section: 'B1', row: 'E', number: 1, category: 'B', price: 100 },
    ]);

    // Create physical seats for Stadium 2 (2 seats)
    await Seat.create([
      { stadiumId: stadium2._id, section: 'A1', row: 'A', number: 1, category: 'A', price: 150 },
      { stadiumId: stadium2._id, section: 'B1', row: 'E', number: 1, category: 'B', price: 100 },
    ]);
  });

  describe('Role-based access protection', () => {
    it('should return 401 Unauthorized if no token is provided', async () => {
      await request(app)
        .get('/api/v1/admin/matches')
        .expect(401);

      await request(app)
        .post('/api/v1/admin/matches')
        .send({})
        .expect(401);
    });

    it('should return 403 Forbidden if a regular user token is provided', async () => {
      await request(app)
        .get('/api/v1/admin/matches')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      await request(app)
        .post('/api/v1/admin/matches')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          teamA: 'USA',
          teamB: 'Germany',
          round: 'group',
          date: '2026-06-12T20:00:00Z',
          stadiumId: stadium1._id.toString(),
        })
        .expect(403);
    });

    it('should allow access if an admin token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/admin/matches')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
    });
  });

  describe('CRUD Match operations', () => {
    it('should create a new match and auto-calculate capacity based on stadium seats', async () => {
      const res = await request(app)
        .post('/api/v1/admin/matches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamA: 'France',
          teamB: 'Japan',
          round: 'group',
          group: 'A',
          date: '2026-06-17T20:00:00Z',
          stadiumId: stadium1._id.toString(),
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.teamA).toBe('France');
      expect(res.body.teamB).toBe('Japan');
      expect(res.body.totalSeats).toBe(3); // Stadium 1 has 3 seats registered
      expect(res.body.availableSeats).toBe(3);
      expect(res.body.isActive).toBe(true);
      expect(res.body.stadium.name).toBe('Mercedes-Benz Stadium');
    });

    it('should return 400 Validation Error for invalid input payload', async () => {
      // Missing teamB and invalid round enum
      const res = await request(app)
        .post('/api/v1/admin/matches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamA: 'France',
          round: 'invalid-round',
          date: '2026-06-17T20:00:00Z',
          stadiumId: stadium1._id.toString(),
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should list all matches (both active and inactive)', async () => {
      // Create one active and one inactive match
      await Match.create({
        teamA: 'USA',
        teamB: 'Germany',
        round: 'group',
        date: new Date(),
        stadiumId: stadium1._id,
        totalSeats: 3,
        availableSeats: 3,
        isActive: true,
      });

      await Match.create({
        teamA: 'France',
        teamB: 'Japan',
        round: 'group',
        date: new Date(),
        stadiumId: stadium1._id,
        totalSeats: 3,
        availableSeats: 3,
        isActive: false, // Inactive
      });

      const res = await request(app)
        .get('/api/v1/admin/matches')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
      const activeMatch = res.body.find(m => m.teamA === 'USA');
      const inactiveMatch = res.body.find(m => m.teamA === 'France');
      expect(activeMatch.isActive).toBe(true);
      expect(inactiveMatch.isActive).toBe(false);
    });

    it('should update match fields (e.g. teams, date)', async () => {
      const match = await Match.create({
        teamA: 'USA',
        teamB: 'Germany',
        round: 'group',
        date: new Date(),
        stadiumId: stadium1._id,
        totalSeats: 3,
        availableSeats: 3,
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/v1/admin/matches/${match._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamA: 'United States',
          teamB: 'Germany Updated',
        })
        .expect(200);

      expect(res.body.teamA).toBe('United States');
      expect(res.body.teamB).toBe('Germany Updated');
    });

    it('should allow changing stadium and recalculate capacity if no tickets are sold', async () => {
      const match = await Match.create({
        teamA: 'USA',
        teamB: 'Germany',
        round: 'group',
        date: new Date(),
        stadiumId: stadium1._id, // Stadium 1 has 3 seats
        totalSeats: 3,
        availableSeats: 3,
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/v1/admin/matches/${match._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stadiumId: stadium2._id.toString(), // Stadium 2 has 2 seats
        })
        .expect(200);

      expect(res.body.stadium.id).toBe(stadium2._id.toString());
      expect(res.body.totalSeats).toBe(2);
      expect(res.body.availableSeats).toBe(2);
    });

    it('should reject stadium update if tickets have already been sold for the match', async () => {
      const match = await Match.create({
        teamA: 'USA',
        teamB: 'Germany',
        round: 'group',
        date: new Date(),
        stadiumId: stadium1._id,
        totalSeats: 3,
        availableSeats: 2,
        isActive: true,
      });

      // Sell a ticket
      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId: match._id,
        seatId: new mongoose.Types.ObjectId(),
        userId: regularUser._id,
        qrCode: 'qr-code-123',
        status: 'valid',
      });

      const res = await request(app)
        .put(`/api/v1/admin/matches/${match._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stadiumId: stadium2._id.toString(),
        })
        .expect(400);

      expect(res.body.error.code).toBe('STADIUM_CHANGE_FORBIDDEN');
    });

    it('should soft-delete (deactivate) a match', async () => {
      const match = await Match.create({
        teamA: 'USA',
        teamB: 'Germany',
        round: 'group',
        date: new Date(),
        stadiumId: stadium1._id,
        totalSeats: 3,
        availableSeats: 3,
        isActive: true,
      });

      const res = await request(app)
        .delete(`/api/v1/admin/matches/${match._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);

      // Verify in DB that it is indeed inactive but still exists
      const dbMatch = await Match.findById(match._id);
      expect(dbMatch).toBeDefined();
      expect(dbMatch.isActive).toBe(false);
    });
  });
});
