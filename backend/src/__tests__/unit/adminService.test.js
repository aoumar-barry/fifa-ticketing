require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const eventBus = require('../../utils/eventBus');
const { Match, Stadium, Seat, Ticket, User } = require('../../models');
const {
  getAllMatches,
  createMatch,
  updateMatch,
  deactivateMatch,
  getAllStadiums,
  getSalesStats,
  getExportData,
} = require('../../services/adminService');

jest.setTimeout(120000);

describe('adminService Unit Tests', () => {
  let mongod;
  let stadiumId;
  let userId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-unit-admin' });
    await Promise.all([
      Stadium.syncIndexes(),
      Match.syncIndexes(),
      Seat.syncIndexes(),
      Ticket.syncIndexes(),
      User.syncIndexes(),
    ]);
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    userId = new mongoose.Types.ObjectId().toString();

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
      User.deleteMany({}),
    ]);
  });

  describe('getAllMatches', () => {
    it('returns empty array when no matches exist', async () => {
      const res = await getAllMatches();
      expect(res).toEqual([]);
    });

    it('returns all matches formatted correctly', async () => {
      const match = await Match.create({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: new Date(),
        stadiumId,
        totalSeats: 120,
        availableSeats: 120,
        isActive: true,
      });

      const res = await getAllMatches();
      expect(res).toHaveLength(1);
      expect(res[0].id.toString()).toBe(match._id.toString());
      expect(res[0].teamA).toBe('Qatar');
      expect(res[0].stadium.name).toBe('Lusail Stadium');
    });

    it('returns formatted match without stadium when stadiumId is missing', async () => {
      const match = await Match.create({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: new Date(),
        stadiumId,
        totalSeats: 120,
        availableSeats: 120,
        isActive: true,
      });

      jest.spyOn(Match, 'find').mockImplementationOnce(() => ({
        populate: jest.fn().mockResolvedValue([
          {
            _id: match._id,
            teamA: 'Qatar',
            teamB: 'Ecuador',
            round: 'group',
            date: match.date,
            totalSeats: 120,
            availableSeats: 120,
            isActive: true,
            stadiumId: null,
          }
        ])
      }));

      const res = await getAllMatches();
      expect(res).toHaveLength(1);
      expect(res[0].stadium).toBeNull();
    });
  });

  describe('createMatch', () => {
    it('throws AppError 400 if stadium ID format is invalid', async () => {
      await expect(
        createMatch({
          teamA: 'Qatar',
          teamB: 'Ecuador',
          round: 'group',
          date: '2026-06-15',
          stadiumId: 'invalid-id',
        })
      ).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_INPUT',
        message: 'Invalid stadium ID format',
      });
    });

    it('throws AppError 404 if stadium does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await expect(
        createMatch({
          teamA: 'Qatar',
          teamB: 'Ecuador',
          round: 'group',
          date: '2026-06-15',
          stadiumId: nonExistentId,
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'STADIUM_NOT_FOUND',
        message: 'Stadium not found',
      });
    });

    it('creates match with default seat count if no seats in stadium', async () => {
      const res = await createMatch({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: '2026-06-15',
        stadiumId,
      });

      expect(res.totalSeats).toBe(120);
      expect(res.availableSeats).toBe(120);
      expect(res.isActive).toBe(true);
    });

    it('creates match with capacity based on stadium seats count', async () => {
      await Seat.create({ stadiumId, section: 'A', row: '1', number: 1, category: 'A', price: 100 });
      await Seat.create({ stadiumId, section: 'A', row: '1', number: 2, category: 'A', price: 100 });

      const res = await createMatch({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: '2026-06-15',
        stadiumId,
      });

      expect(res.totalSeats).toBe(2);
      expect(res.availableSeats).toBe(2);
    });
  });

  describe('updateMatch', () => {
    let matchId;

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
    });

    it('throws AppError 400 if match ID format is invalid', async () => {
      await expect(updateMatch('invalid-id', {})).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_INPUT',
      });
    });

    it('throws AppError 404 if match is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await expect(updateMatch(nonExistentId, {})).rejects.toMatchObject({
        status: 404,
        code: 'MATCH_NOT_FOUND',
      });
    });

    it('throws AppError 400 if new stadium ID format is invalid', async () => {
      await expect(updateMatch(matchId, { stadiumId: 'invalid-id' })).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_INPUT',
      });
    });

    it('throws AppError 404 if new stadium is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await expect(updateMatch(matchId, { stadiumId: nonExistentId })).rejects.toMatchObject({
        status: 404,
        code: 'STADIUM_NOT_FOUND',
      });
    });

    it('throws AppError 400 if trying to change stadium but tickets are already sold', async () => {
      const anotherStadium = await Stadium.create({
        name: 'Al Bayt Stadium',
        city: 'Al Khor',
        country: 'Qatar',
        capacity: 60000,
      });

      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId,
        seatId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        qrCode: 'qr-1',
        status: 'valid',
      });

      await expect(updateMatch(matchId, { stadiumId: anotherStadium._id.toString() })).rejects.toMatchObject({
        status: 400,
        code: 'STADIUM_CHANGE_FORBIDDEN',
      });
    });

    it('recalculates capacity on new stadium without sold tickets', async () => {
      const anotherStadium = await Stadium.create({
        name: 'Al Bayt Stadium',
        city: 'Al Khor',
        country: 'Qatar',
        capacity: 60000,
      });

      await Seat.create({ stadiumId: anotherStadium._id, section: 'A', row: '1', number: 1, category: 'A', price: 100 });

      const res = await updateMatch(matchId, { stadiumId: anotherStadium._id.toString() });
      expect(res.totalSeats).toBe(1);
      expect(res.availableSeats).toBe(1);
    });

    it('recalculates capacity on new stadium with 0 seats returning default 120', async () => {
      const anotherStadium = await Stadium.create({
        name: 'Al Bayt Stadium',
        city: 'Al Khor',
        country: 'Qatar',
        capacity: 60000,
      });

      const res = await updateMatch(matchId, { stadiumId: anotherStadium._id.toString() });
      expect(res.totalSeats).toBe(120);
      expect(res.availableSeats).toBe(120);
    });

    it('adjusts manual capacity and computes available seats with sold tickets', async () => {
      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId,
        seatId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        qrCode: 'qr-1',
        status: 'valid',
      });

      const res = await updateMatch(matchId, { totalSeats: 50 });
      expect(res.totalSeats).toBe(50);
      expect(res.availableSeats).toBe(49); // 50 - 1 sold
    });

    it('updates text fields and dates, and emits eventBus event', async () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      
      const res = await updateMatch(matchId, {
        teamA: 'Qatar Updated',
        teamB: 'Ecuador Updated',
        round: 'round16',
        group: 'A',
        date: '2026-06-20T18:00:00Z',
        isActive: false,
      });

      expect(res.teamA).toBe('Qatar Updated');
      expect(res.teamB).toBe('Ecuador Updated');
      expect(res.round).toBe('round16');
      expect(res.group).toBe('A');
      expect(res.isActive).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('match:updated', expect.any(Object));
    });
  });

  describe('deactivateMatch', () => {
    it('throws AppError 400 if match ID format is invalid', async () => {
      await expect(deactivateMatch('invalid-id')).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_INPUT',
      });
    });

    it('throws AppError 404 if match not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await expect(deactivateMatch(nonExistentId)).rejects.toMatchObject({
        status: 404,
        code: 'MATCH_NOT_FOUND',
      });
    });

    it('deactivates match successfully', async () => {
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

      const res = await deactivateMatch(match._id.toString());
      expect(res.isActive).toBe(false);
    });
  });

  describe('getAllStadiums', () => {
    it('returns all stadiums sorted by name', async () => {
      await Stadium.create({ name: 'Z Stadium', city: 'City', country: 'Country', capacity: 10000 });
      await Stadium.create({ name: 'A Stadium', city: 'City', country: 'Country', capacity: 10000 });

      const res = await getAllStadiums();
      expect(res).toHaveLength(3); // including setup stadium
      expect(res[0].name).toBe('A Stadium');
    });
  });

  describe('getSalesStats', () => {
    it('computes sales stats correctly', async () => {
      const match = await Match.create({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: new Date(),
        stadiumId,
        totalSeats: 100,
        availableSeats: 98,
        isActive: true,
      });

      const seat1 = await Seat.create({ stadiumId, section: 'A', row: '1', number: 1, category: 'A', price: 150 });
      const seat2 = await Seat.create({ stadiumId, section: 'A', row: '1', number: 2, category: 'A', price: 200 });

      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId: match._id,
        seatId: seat1._id,
        userId: new mongoose.Types.ObjectId(),
        qrCode: 'qr-1',
        status: 'valid',
      });

      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId: match._id,
        seatId: seat2._id,
        userId: new mongoose.Types.ObjectId(),
        qrCode: 'qr-2',
        status: 'used',
      });

      // Valid/used status tickets count. Cancelled do not count.
      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId: match._id,
        seatId: seat2._id,
        userId: new mongoose.Types.ObjectId(),
        qrCode: 'qr-3',
        status: 'cancelled',
      });

      const stats = await getSalesStats();
      expect(stats.totalRevenue).toBe(350); // 150 + 200
      expect(stats.ticketsSold).toBe(2);
      expect(stats.activeMatchesCount).toBe(1);
      expect(stats.matchStats).toHaveLength(1);
      expect(stats.matchStats[0].ticketsSold).toBe(2);
      expect(stats.matchStats[0].revenue).toBe(350);
      expect(stats.matchStats[0].occupancyRate).toBe(0.02); // 2/100
    });

    it('computes sales stats handle missing ticket seat price or unregistered matches gracefully', async () => {
      const match = await Match.create({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: new Date(),
        stadiumId,
        totalSeats: 0,
        availableSeats: 0, // testing 0 total seats fallback for occupancyRate
        isActive: true,
      });

      // Ticket with no seatId price (price is undefined in schema if mock or seat not populated properly)
      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId: match._id,
        seatId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        qrCode: 'qr-no-price',
        status: 'valid',
      });

      // Ticket with random matchId that does not exist in matches list
      const nonExistentMatchId = new mongoose.Types.ObjectId();
      await Ticket.create({
        orderId: new mongoose.Types.ObjectId(),
        matchId: nonExistentMatchId,
        seatId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        qrCode: 'qr-no-match',
        status: 'valid',
      });

      const stats = await getSalesStats();
      expect(stats.totalRevenue).toBe(0);
      expect(stats.matchStats[0].occupancyRate).toBe(0);
    });
  });

  describe('getExportData', () => {
    it('returns empty array when no tickets sold', async () => {
      const res = await getExportData();
      expect(res).toEqual([]);
    });

    it('returns formatted export list for sold tickets', async () => {
      const match = await Match.create({
        teamA: 'Qatar',
        teamB: 'Ecuador',
        round: 'group',
        date: new Date('2026-06-15T18:00:00Z'),
        stadiumId,
        totalSeats: 100,
        availableSeats: 99,
        isActive: true,
      });

      const user = await User.create({
        email: 'buyer@example.com',
        firstName: 'Buyer',
        lastName: 'One',
      });

      const seat = await Seat.create({ stadiumId, section: 'A', row: '1', number: 1, category: 'A', price: 150 });
      const orderId = new mongoose.Types.ObjectId();

      await Ticket.create({
        orderId,
        matchId: match._id,
        seatId: seat._id,
        userId: user._id,
        qrCode: 'qr-1',
        status: 'valid',
      });

      const res = await getExportData();
      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        orderId: orderId.toString(),
        ticketId: expect.any(String),
        buyerEmail: 'buyer@example.com',
        matchTeams: 'Qatar vs Ecuador',
        matchDate: '2026-06-15T18:00:00.000Z',
        stadium: 'Lusail Stadium',
        section: 'A',
        row: '1',
        seatNumber: 1,
        category: 'A',
        price: 150,
      });
    });

    it('handles tickets with missing populated fields gracefully', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.then = (resolve) => resolve([
        {
          _id: new mongoose.Types.ObjectId(),
          status: 'valid',
          orderId: null,
          userId: null,
          matchId: null,
          seatId: null,
        }
      ]);
      jest.spyOn(Ticket, 'find').mockReturnValue(mockQuery);

      const res = await getExportData();
      expect(res).toHaveLength(1);
      expect(res[0].orderId).toBe('');
      expect(res[0].buyerEmail).toBe('');
      expect(res[0].matchTeams).toBe('');
      expect(res[0].stadium).toBe('');
      expect(res[0].section).toBe('');
      expect(res[0].price).toBe(0);
    });
  });
});
