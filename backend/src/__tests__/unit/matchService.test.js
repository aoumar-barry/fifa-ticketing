require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { Match, Stadium, Seat, Ticket } = require('../../models');
const { setRedisClient } = require('../../config/redis');
const { getMatches, getMatchById, getMatchSeats } = require('../../services/matchService');

jest.setTimeout(120000);

describe('matchService Unit Tests', () => {
  let mongod;
  let stadiumId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-unit-match' });
    await Promise.all([
      Stadium.syncIndexes(),
      Match.syncIndexes(),
      Seat.syncIndexes(),
      Ticket.syncIndexes(),
    ]);
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const stadium = await Stadium.create({
      name: 'Lusail Stadium',
      city: 'Lusail',
      country: 'Qatar',
      capacity: 80000,
    });
    stadiumId = stadium._id.toString();
  });

  afterEach(async () => {
    await Promise.all([
      Stadium.deleteMany({}),
      Match.deleteMany({}),
      Seat.deleteMany({}),
      Ticket.deleteMany({}),
    ]);
    setRedisClient(null);
  });

  describe('getMatches', () => {
    it('returns empty array when no matches exist', async () => {
      const res = await getMatches();
      expect(res).toEqual([]);
    });

    it('filters by teamA, teamB, round, stadiumId, date', async () => {
      const match1 = await Match.create({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: new Date('2026-06-15T18:00:00Z'),
        stadiumId,
        totalSeats: 100,
        availableSeats: 100,
        isActive: true,
      });

      const match2 = await Match.create({
        teamA: 'France',
        teamB: 'Brazil',
        round: 'final',
        date: new Date('2026-07-05T20:00:00Z'),
        stadiumId,
        totalSeats: 100,
        availableSeats: 100,
        isActive: true,
      });

      // 1. No filters: returns both
      let res = await getMatches();
      expect(res).toHaveLength(2);

      // 2. Filter by teamA
      res = await getMatches({ teamA: 'Qatar' });
      expect(res).toHaveLength(1);
      expect(res[0].id.toString()).toBe(match1._id.toString());

      // 3. Filter by teamB
      res = await getMatches({ teamB: 'Brazil' });
      expect(res).toHaveLength(1);
      expect(res[0].id.toString()).toBe(match2._id.toString());

      // 4. Filter by round
      res = await getMatches({ round: 'final' });
      expect(res).toHaveLength(1);
      expect(res[0].id.toString()).toBe(match2._id.toString());

      // 5. Filter by stadiumId
      res = await getMatches({ stadiumId });
      expect(res).toHaveLength(2);

      // 6. Filter by date (match1 date)
      res = await getMatches({ date: '2026-06-15' });
      expect(res).toHaveLength(1);
      expect(res[0].id.toString()).toBe(match1._id.toString());
    });

    it('throws AppError 400 if stadiumId is invalid format', async () => {
      await expect(getMatches({ stadiumId: 'invalid-id' })).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_INPUT',
        message: 'Invalid stadiumId format',
      });
    });

    it('throws AppError 400 if date is invalid format', async () => {
      await expect(getMatches({ date: 'invalid-date' })).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_INPUT',
        message: 'Invalid date format',
      });
    });
  });

  describe('getMatchById', () => {
    it('throws AppError 400 if match ID format is invalid', async () => {
      await expect(getMatchById('invalid-id')).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_INPUT',
      });
    });

    it('throws AppError 404 if match is not found or inactive', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await expect(getMatchById(nonExistentId)).rejects.toMatchObject({
        status: 404,
        code: 'MATCH_NOT_FOUND',
      });

      const inactiveMatch = await Match.create({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: new Date(),
        stadiumId,
        totalSeats: 100,
        availableSeats: 100,
        isActive: false,
      });

      await expect(getMatchById(inactiveMatch._id.toString())).rejects.toMatchObject({
        status: 404,
        code: 'MATCH_NOT_FOUND',
      });
    });

    it('returns match formatted successfully', async () => {
      const match = await Match.create({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: new Date(),
        stadiumId,
        totalSeats: 100,
        availableSeats: 100,
        isActive: true,
      });

      const res = await getMatchById(match._id.toString());
      expect(res.teamA).toBe('Qatar');
      expect(res.stadium.name).toBe('Lusail Stadium');
    });
  });

  describe('getMatchSeats', () => {
    let matchId;
    let seat1;
    let seat2;

    beforeEach(async () => {
      const match = await Match.create({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: new Date(),
        stadiumId,
        totalSeats: 100,
        availableSeats: 100,
        isActive: true,
      });
      matchId = match._id.toString();

      seat1 = await Seat.create({ stadiumId, section: 'A', row: '1', number: 1, category: 'A', price: 100 });
      seat2 = await Seat.create({ stadiumId, section: 'A', row: '1', number: 2, category: 'A', price: 100 });
    });

    it('throws AppError 400 if match ID format is invalid', async () => {
      await expect(getMatchSeats('invalid-id')).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_INPUT',
      });
    });

    it('throws AppError 404 if match is not found or inactive', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await expect(getMatchSeats(nonExistentId)).rejects.toMatchObject({
        status: 404,
        code: 'MATCH_NOT_FOUND',
      });
    });

    it('returns seats with status mapping when Redis client is not initialized or throws', async () => {
      const seats = await getMatchSeats(matchId);
      expect(seats).toHaveLength(2);
      expect(seats[0].status).toBe('available');
      expect(seats[1].status).toBe('available');
    });

    it('returns seats with correct status (sold, locked, available) from DB and Redis', async () => {
      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId,
        seatId: seat1._id,
        userId: new mongoose.Types.ObjectId(),
        qrCode: 'qr-1',
        status: 'valid',
      });

      const mockRedis = {
        mget: jest.fn().mockResolvedValue([
          null,
          'user-id-abc',
        ]),
      };
      setRedisClient(mockRedis);

      const seats = await getMatchSeats(matchId);
      expect(seats).toHaveLength(2);
      
      expect(seats[0].id.toString()).toBe(seat1._id.toString());
      expect(seats[0].status).toBe('sold');

      expect(seats[1].id.toString()).toBe(seat2._id.toString());
      expect(seats[1].status).toBe('locked');

      expect(mockRedis.mget).toHaveBeenCalledWith([
        `seat:${seat1._id}`,
        `seat:${seat2._id}`,
      ]);
    });
  });
});
