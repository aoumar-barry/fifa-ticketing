require('dotenv').config();

// Mock firebase-admin
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

// Set JWT secrets
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
const { User, Match, Stadium, Seat, Order, Ticket } = require('../../models');

jest.setTimeout(120000);

describe('Order integration tests', () => {
  let mongod;
  let app;
  let user1;
  let user2;
  let adminUser;
  let tokenUser1;
  let tokenUser2;
  let tokenAdmin;
  let stadium;
  let match;
  let seat1;
  let seat2;
  let order1;
  let order2;
  let ticket1;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-order-test' });

    await Promise.all([
      User.syncIndexes(),
      Stadium.syncIndexes(),
      Match.syncIndexes(),
      Seat.syncIndexes(),
      Order.syncIndexes(),
      Ticket.syncIndexes(),
    ]);

    app = createApp({ frontendUrl: 'http://localhost:5173' });
  }, 120000);

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
      Order.deleteMany({}),
      Ticket.deleteMany({}),
    ]);

    // Create users
    user1 = await User.create({
      email: 'user1@example.com',
      passwordHash: 'dummyhash',
      firstName: 'User',
      lastName: 'One',
      isVerified: true,
      role: 'user',
    });

    user2 = await User.create({
      email: 'user2@example.com',
      passwordHash: 'dummyhash',
      firstName: 'User',
      lastName: 'Two',
      isVerified: true,
      role: 'user',
    });

    adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: 'dummyhash',
      firstName: 'Admin',
      lastName: 'User',
      isVerified: true,
      role: 'admin',
    });

    // Create tokens
    tokenUser1 = jwt.sign(
      { userId: user1._id, role: user1.role, email: user1.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    tokenUser2 = jwt.sign(
      { userId: user2._id, role: user2.role, email: user2.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    tokenAdmin = jwt.sign(
      { userId: adminUser._id, role: adminUser.role, email: adminUser.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Create stadium
    stadium = await Stadium.create({
      name: 'Hard Rock Stadium',
      city: 'Miami',
      country: 'USA',
      capacity: 65000,
    });

    // Create match
    match = await Match.create({
      teamA: 'Brazil',
      teamB: 'Germany',
      round: 'semi',
      date: new Date('2026-07-14T20:00:00Z'),
      stadiumId: stadium._id,
      totalSeats: 100,
      availableSeats: 98,
      isActive: true,
    });

    // Create seats
    seat1 = await Seat.create({
      stadiumId: stadium._id,
      section: '100',
      row: '5',
      number: 10,
      category: 'A',
      price: 300,
      status: 'sold',
    });

    seat2 = await Seat.create({
      stadiumId: stadium._id,
      section: '100',
      row: '5',
      number: 11,
      category: 'A',
      price: 300,
      status: 'sold',
    });

    // Create order for user 1
    order1 = await Order.create({
      userId: user1._id,
      totalAmount: 300,
      status: 'confirmed',
      stripePaymentIntentId: 'pi_order_test_1',
    });

    // Create order for user 2
    order2 = await Order.create({
      userId: user2._id,
      totalAmount: 300,
      status: 'confirmed',
      stripePaymentIntentId: 'pi_order_test_2',
    });

    // Create ticket for order 1
    ticket1 = await Ticket.create({
      orderId: order1._id,
      matchId: match._id,
      seatId: seat1._id,
      userId: user1._id,
      qrCode: 'uuid-qr-code-user-1',
      pdfUrl: 'https://azure.storage/tickets/ticket1.pdf',
      status: 'valid',
    });

    // Create ticket for order 2
    await Ticket.create({
      orderId: order2._id,
      matchId: match._id,
      seatId: seat2._id,
      userId: user2._id,
      qrCode: 'uuid-qr-code-user-2',
      pdfUrl: 'https://azure.storage/tickets/ticket2.pdf',
      status: 'valid',
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/orders
  // -------------------------------------------------------------------------
  describe('GET /api/v1/orders — Historique des commandes', () => {
    it('should return 200 with the orders only belonging to the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(1);
      
      const returnedOrder = res.body[0];
      expect(returnedOrder._id).toBe(order1._id.toString());
      expect(returnedOrder.userId).toBe(user1._id.toString());
      expect(returnedOrder.totalAmount).toBe(300);

      // Verify tickets and populated info
      expect(returnedOrder.tickets).toHaveLength(1);
      const returnedTicket = returnedOrder.tickets[0];
      expect(returnedTicket._id).toBe(ticket1._id.toString());
      expect(returnedTicket.qrCode).toBe('uuid-qr-code-user-1');
      expect(returnedTicket.pdfUrl).toBe('https://azure.storage/tickets/ticket1.pdf');
      
      // Match info check
      expect(returnedTicket.matchId).toBeDefined();
      expect(returnedTicket.matchId.teamA).toBe('Brazil');
      expect(returnedTicket.matchId.teamB).toBe('Germany');
      expect(returnedTicket.matchId.round).toBe('semi');

      // Stadium info check
      expect(returnedTicket.matchId.stadiumId).toBeDefined();
      expect(returnedTicket.matchId.stadiumId.name).toBe('Hard Rock Stadium');
      expect(returnedTicket.matchId.stadiumId.city).toBe('Miami');

      // Seat info check
      expect(returnedTicket.seatId).toBeDefined();
      expect(returnedTicket.seatId.section).toBe('100');
      expect(returnedTicket.seatId.row).toBe('5');
      expect(returnedTicket.seatId.number).toBe(10);
    });

    it('should return 401 when unauthorized (no token)', async () => {
      await request(app)
        .get('/api/v1/orders')
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/orders/:id
  // -------------------------------------------------------------------------
  describe('GET /api/v1/orders/:id — Détails d\'une commande', () => {
    it('should return 200 with order and populated tickets for the owner', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${order1._id}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(res.body._id).toBe(order1._id.toString());
      expect(res.body.userId).toBe(user1._id.toString());
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body.tickets[0]._id).toBe(ticket1._id.toString());
      expect(res.body.tickets[0].matchId.teamA).toBe('Brazil');
      expect(res.body.tickets[0].seatId.number).toBe(10);
    });

    it('should return 200 with details for an admin even if they do not own the order', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${order1._id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body._id).toBe(order1._id.toString());
      expect(res.body.userId).toBe(user1._id.toString());
      expect(res.body.tickets).toHaveLength(1);
    });

    it('should return 403 when requesting an order belonging to another user', async () => {
      await request(app)
        .get(`/api/v1/orders/${order1._id}`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .expect(403);
    });

    it('should return 404 if the order does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .get(`/api/v1/orders/${nonExistentId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(404);
    });

    it('should return 400 for an invalid MongoDB ObjectId format', async () => {
      await request(app)
        .get('/api/v1/orders/invalid-id-format')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(400);
    });
  });
});
