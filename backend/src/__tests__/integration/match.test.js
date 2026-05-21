const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createApp } = require('../../app');
const { Match, Stadium, Seat, Ticket } = require('../../models');
const { setRedisClient } = require('../../config/redis');

describe('Matches integration tests', () => {
  let mongod;
  let app;
  let mockRedis;
  
  // Test data variables
  let stadium1;
  let stadium2;
  let match1;
  let match2;
  let matchInactive;
  let seatA1;
  let seatA2;
  let seatB1;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-match-test' });
    
    // Sync indices
    await Promise.all([
      Stadium.syncIndexes(),
      Match.syncIndexes(),
      Seat.syncIndexes(),
      Ticket.syncIndexes(),
    ]);

    // Setup mock Redis client
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
    // Clear data
    await Promise.all([
      Stadium.deleteMany({}),
      Match.deleteMany({}),
      Seat.deleteMany({}),
      Ticket.deleteMany({}),
    ]);
    
    jest.clearAllMocks();
    mockRedis.mget.mockResolvedValue([]);

    // Create Stadiums
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

    // Create Matches
    match1 = await Match.create({
      teamA: 'USA',
      teamB: 'Germany',
      round: 'group',
      group: 'A',
      date: new Date('2026-06-12T20:00:00Z'),
      stadiumId: stadium1._id,
      totalSeats: 120,
      availableSeats: 119,
      isActive: true,
    });

    match2 = await Match.create({
      teamA: 'France',
      teamB: 'Japan',
      round: 'group',
      group: 'A',
      date: new Date('2026-06-17T20:00:00Z'),
      stadiumId: stadium2._id,
      totalSeats: 120,
      availableSeats: 120,
      isActive: true,
    });

    matchInactive = await Match.create({
      teamA: 'Colombia',
      teamB: 'Senegal',
      round: 'group',
      group: 'A',
      date: new Date('2026-06-22T20:00:00Z'),
      stadiumId: stadium1._id,
      totalSeats: 120,
      availableSeats: 120,
      isActive: false, // Inactive
    });

    // Create Seats for Stadium 1
    seatA1 = await Seat.create({
      stadiumId: stadium1._id,
      section: 'A1',
      row: 'A',
      number: 1,
      category: 'A',
      price: 150,
      status: 'available',
    });

    seatA2 = await Seat.create({
      stadiumId: stadium1._id,
      section: 'A1',
      row: 'A',
      number: 2,
      category: 'A',
      price: 150,
      status: 'available',
    });

    seatB1 = await Seat.create({
      stadiumId: stadium1._id,
      section: 'B1',
      row: 'E',
      number: 1,
      category: 'B',
      price: 100,
      status: 'available',
    });
  });

  describe('GET /api/v1/matches', () => {
    it('should return all active matches with populated stadium info', async () => {
      const res = await request(app)
        .get('/api/v1/matches')
        .expect(200);

      expect(res.body).toHaveLength(2);
      
      const usaMatch = res.body.find((m) => m.teamA === 'USA');
      expect(usaMatch).toBeDefined();
      expect(usaMatch.stadium).toBeDefined();
      expect(usaMatch.stadium.name).toBe('Mercedes-Benz Stadium');
      expect(usaMatch.stadium.city).toBe('Atlanta');

      const inactiveMatch = res.body.find((m) => m.teamA === 'Colombia');
      expect(inactiveMatch).toBeUndefined();
    });

    it('should filter matches by teamA', async () => {
      const res = await request(app)
        .get('/api/v1/matches?teamA=France')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].teamA).toBe('France');
    });

    it('should filter matches by stadiumId', async () => {
      const res = await request(app)
        .get(`/api/v1/matches?stadiumId=${stadium2._id}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].teamA).toBe('France');
    });

    it('should return bad request for invalid stadiumId format', async () => {
      const res = await request(app)
        .get('/api/v1/matches?stadiumId=invalid-id')
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should filter matches by date', async () => {
      const res = await request(app)
        .get('/api/v1/matches?date=2026-06-12')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].teamA).toBe('USA');
    });

    it('should return bad request for invalid date format', async () => {
      const res = await request(app)
        .get('/api/v1/matches?date=invalid-date')
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('GET /api/v1/matches/:id', () => {
    it('should return match details with populated stadium info', async () => {
      const res = await request(app)
        .get(`/api/v1/matches/${match1._id}`)
        .expect(200);

      expect(res.body.teamA).toBe('USA');
      expect(res.body.stadium.name).toBe('Mercedes-Benz Stadium');
    });

    it('should return 404 for non-existent match ID', async () => {
      const randomId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/matches/${randomId}`)
        .expect(404);

      expect(res.body.error.code).toBe('MATCH_NOT_FOUND');
    });

    it('should return 404 for inactive match', async () => {
      const res = await request(app)
        .get(`/api/v1/matches/${matchInactive._id}`)
        .expect(404);

      expect(res.body.error.code).toBe('MATCH_NOT_FOUND');
    });

    it('should return 400 for invalid match ID format', async () => {
      const res = await request(app)
        .get('/api/v1/matches/invalid-id')
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('GET /api/v1/matches/:id/seats', () => {
    it('should return all seats with status based on tickets and redis locks', async () => {
      // 1. Simulate seatA1 as SOLD by creating a valid Ticket
      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId: match1._id,
        seatId: seatA1._id,
        userId: new mongoose.Types.ObjectId(),
        qrCode: 'qr-code-test-123',
        status: 'valid',
      });

      // 2. Simulate seatA2 as LOCKED in Redis
      // mockRedis.mget returns array corresponding to: seatA1, seatA2, seatB1
      mockRedis.mget.mockResolvedValue([
        null,                  // seatA1: not locked in redis (it is sold in db anyway)
        'some-user-id-lock',   // seatA2: locked
        null,                  // seatB1: not locked
      ]);

      const res = await request(app)
        .get(`/api/v1/matches/${match1._id}/seats`)
        .expect(200);

      expect(res.body).toHaveLength(3);

      const mappedSeats = {};
      res.body.forEach((s) => {
        mappedSeats[`${s.section}-${s.row}-${s.number}`] = s;
      });

      // Check seat A1 (Sold)
      expect(mappedSeats['A1-A-1']).toBeDefined();
      expect(mappedSeats['A1-A-1'].status).toBe('sold');
      expect(mappedSeats['A1-A-1'].price).toBe(150);

      // Check seat A2 (Locked)
      expect(mappedSeats['A1-A-2']).toBeDefined();
      expect(mappedSeats['A1-A-2'].status).toBe('locked');
      expect(mappedSeats['A1-A-2'].price).toBe(150);

      // Check seat B1 (Available)
      expect(mappedSeats['B1-E-1']).toBeDefined();
      expect(mappedSeats['B1-E-1'].status).toBe('available');
      expect(mappedSeats['B1-E-1'].price).toBe(100);
    });

    it('should return 404 for seats of non-existent match ID', async () => {
      const randomId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/matches/${randomId}/seats`)
        .expect(404);

      expect(res.body.error.code).toBe('MATCH_NOT_FOUND');
    });

    it('should return 400 for invalid match ID format', async () => {
      const res = await request(app)
        .get('/api/v1/matches/invalid-id/seats')
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_INPUT');
    });
  });
});
