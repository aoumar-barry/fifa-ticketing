require('dotenv').config();

// Create a single shared mock stripe object
const mockStripe = {
  paymentIntents: {
    create: jest.fn().mockImplementation(async (params) => {
      return {
        id: 'pi_mock_123',
        client_secret: 'pi_mock_123_secret_xyz',
        amount: params.amount,
        currency: params.currency,
        status: 'requires_payment_method',
        metadata: params.metadata,
      };
    }),
    retrieve: jest.fn().mockImplementation(async (id) => {
      return {
        id,
        status: 'succeeded',
        amount: 15000,
        currency: 'usd',
        metadata: {},
      };
    }),
  },
  webhooks: {
    constructEvent: jest.fn().mockImplementation((rawBody, signature, secret) => {
      if (signature === 'invalid_sig') {
        throw new Error('Invalid signature');
      }
      return JSON.parse(rawBody.toString());
    }),
  },
};

// Mock stripe before imports to return the shared mockStripe object
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

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
const { User, Match, Stadium, Seat, Cart, Order, Payment } = require('../../models');
const { _internals: lockInternals } = require('../../services/seatLockService');

jest.setTimeout(120000);

describe('Payment integration tests', () => {
  let mongod;
  let app;
  let accessToken;
  let user;
  let stadium;
  let match;
  let seat;
  let cart;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-payment-test' });

    await Promise.all([
      User.syncIndexes(),
      Stadium.syncIndexes(),
      Match.syncIndexes(),
      Seat.syncIndexes(),
      Cart.syncIndexes(),
      Order.syncIndexes(),
      Payment.syncIndexes(),
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
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({}),
    ]);

    // Clear locks
    lockInternals.memoryStore.clear();
    for (const timer of lockInternals.memoryTimers.values()) {
      clearTimeout(timer);
    }
    lockInternals.memoryTimers.clear();

    // Create user
    user = await User.create({
      email: 'testpayment@example.com',
      passwordHash: '$2b$10$dummyHashForTestingOnly1234567890abcd',
      firstName: 'Test',
      lastName: 'User',
      isVerified: true,
      role: 'user',
    });

    accessToken = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Create stadium
    stadium = await Stadium.create({
      name: 'MetLife Stadium',
      city: 'East Rutherford',
      country: 'USA',
      capacity: 82500,
    });

    // Create match
    match = await Match.create({
      teamA: 'Argentina',
      teamB: 'France',
      round: 'final',
      date: new Date('2026-07-19T18:00:00Z'),
      stadiumId: stadium._id,
      totalSeats: 100,
      availableSeats: 99, // one reserved
      isActive: true,
    });

    // Create seat
    seat = await Seat.create({
      stadiumId: stadium._id,
      section: 'A',
      row: '1',
      number: 1,
      category: 'A',
      price: 150,
      status: 'locked', // locked since it is in cart
    });

    // Create active cart
    cart = await Cart.create({
      userId: user._id,
      expiresAt: new Date(Date.now() + 600000),
      status: 'active',
      items: [
        {
          matchId: match._id,
          seatId: seat._id,
          price: seat.price,
        },
      ],
    });

    // Mock seat lock in lock service (using correct 'seat:' prefix)
    lockInternals.memoryStore.set(`seat:${seat._id}`, user._id.toString());
  });

  // -------------------------------------------------------------------------
  // TC-PAY-001 — createPaymentIntent
  // -------------------------------------------------------------------------
  describe('POST /api/v1/payment/intent — Créer payment intent', () => {
    it('should create a payment intent and return clientSecret (200)', async () => {
      // Mock create response
      mockStripe.paymentIntents.create.mockResolvedValueOnce({
        id: 'pi_mock_123',
        client_secret: 'pi_mock_123_secret_xyz',
        status: 'requires_payment_method',
      });

      const res = await request(app)
        .post('/api/v1/payment/intent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ cartId: cart._id.toString() })
        .expect(200);

      expect(res.body.clientSecret).toBe('pi_mock_123_secret_xyz');
      expect(res.body.paymentIntentId).toBe('pi_mock_123');

      // Verify pending Order created in DB
      const order = await Order.findOne({ userId: user._id });
      expect(order).not.toBeNull();
      expect(order.status).toBe('pending');
      expect(order.totalAmount).toBe(150);
      expect(order.stripePaymentIntentId).toBe('pi_mock_123');

      // Verify pending Payment created in DB
      const payment = await Payment.findOne({ orderId: order._id });
      expect(payment).not.toBeNull();
      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(150);
      expect(payment.transactionId).toBe('pi_mock_123');
    });

    it('should return 401 when unauthorized', async () => {
      await request(app)
        .post('/api/v1/payment/intent')
        .send({ cartId: cart._id.toString() })
        .expect(401);
    });

    it('should return 403 when cart belongs to another user', async () => {
      const otherUser = await User.create({
        email: 'otheruser@example.com',
        passwordHash: '$2b$10$dummyHashForTestingOnly1234567890abcd',
        firstName: 'Other',
        lastName: 'User',
        isVerified: true,
        role: 'user',
      });
      const otherToken = jwt.sign(
        { userId: otherUser._id, role: otherUser.role, email: otherUser.email },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      await request(app)
        .post('/api/v1/payment/intent')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ cartId: cart._id.toString() })
        .expect(403);
    });

    it('should return 400 when cart is not active', async () => {
      cart.status = 'confirmed';
      await cart.save();

      await request(app)
        .post('/api/v1/payment/intent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ cartId: cart._id.toString() })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // TC-PAY-002 — confirmPayment
  // -------------------------------------------------------------------------
  describe('POST /api/v1/payment/confirm — Confirmer paiement', () => {
    it('should confirm payment, mark order/cart confirmed, seat sold, and unlock Redis (200)', async () => {
      // 1. Setup pending order and payment
      const order = await Order.create({
        userId: user._id,
        totalAmount: 150,
        status: 'pending',
        stripePaymentIntentId: 'pi_confirm_123',
      });
      await Payment.create({
        orderId: order._id,
        amount: 150,
        status: 'pending',
        transactionId: 'pi_confirm_123',
      });

      // Mock stripe retrieve for this specific test
      mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({
        id: 'pi_confirm_123',
        status: 'succeeded',
        amount: 15000,
        currency: 'usd',
      });

      // 2. Call confirm endpoint
      const res = await request(app)
        .post('/api/v1/payment/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ cartId: cart._id.toString(), paymentIntentId: 'pi_confirm_123' })
        .expect(200);

      expect(res.body.orderId).toBe(order._id.toString());

      // 3. Verify status updates in DB
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('confirmed');

      const updatedPayment = await Payment.findOne({ orderId: order._id });
      expect(updatedPayment.status).toBe('succeeded');

      const updatedCart = await Cart.findById(cart._id);
      expect(updatedCart.status).toBe('confirmed');

      const updatedSeat = await Seat.findById(seat._id);
      expect(updatedSeat.status).toBe('sold');

      // Verify lock released in Redis/InMemory
      expect(lockInternals.memoryStore.has(`seat:${seat._id}`)).toBe(false);
    });

    it('should return 400 when payment intent status is not succeeded', async () => {
      mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({
        id: 'pi_confirm_fail',
        status: 'requires_payment_method',
        amount: 15000,
        currency: 'usd',
      });

      await request(app)
        .post('/api/v1/payment/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ cartId: cart._id.toString(), paymentIntentId: 'pi_confirm_fail' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // Webhook Tests
  // -------------------------------------------------------------------------
  describe('POST /api/v1/payment/webhook — Webhook Stripe', () => {
    it('should process payment_intent.succeeded event and confirm the order (200)', async () => {
      const order = await Order.create({
        userId: user._id,
        totalAmount: 150,
        status: 'pending',
        stripePaymentIntentId: 'pi_webhook_success',
      });
      await Payment.create({
        orderId: order._id,
        amount: 150,
        status: 'pending',
        transactionId: 'pi_webhook_success',
      });

      const webhookPayload = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_webhook_success',
            status: 'succeeded',
            amount: 15000,
          },
        },
      };

      await request(app)
        .post('/api/v1/payment/webhook')
        .set('stripe-signature', 'valid_sig')
        .send(webhookPayload)
        .expect(200);

      // Verify updates
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('confirmed');

      const updatedPayment = await Payment.findOne({ orderId: order._id });
      expect(updatedPayment.status).toBe('succeeded');

      const updatedCart = await Cart.findById(cart._id);
      expect(updatedCart.status).toBe('confirmed');

      const updatedSeat = await Seat.findById(seat._id);
      expect(updatedSeat.status).toBe('sold');
    });

    it('should process payment_intent.payment_failed event and cancel the order (200)', async () => {
      const order = await Order.create({
        userId: user._id,
        totalAmount: 150,
        status: 'pending',
        stripePaymentIntentId: 'pi_webhook_failed',
      });
      await Payment.create({
        orderId: order._id,
        amount: 150,
        status: 'pending',
        transactionId: 'pi_webhook_failed',
      });

      const webhookPayload = {
        id: 'evt_test_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_webhook_failed',
            status: 'failed',
            amount: 15000,
          },
        },
      };

      await request(app)
        .post('/api/v1/payment/webhook')
        .set('stripe-signature', 'valid_sig')
        .send(webhookPayload)
        .expect(200);

      // Verify cancellation & seat release
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('cancelled');

      const updatedPayment = await Payment.findOne({ orderId: order._id });
      expect(updatedPayment.status).toBe('failed');

      const updatedCart = await Cart.findById(cart._id);
      expect(updatedCart.status).toBe('expired');

      const updatedSeat = await Seat.findById(seat._id);
      expect(updatedSeat.status).toBe('available');

      const updatedMatch = await Match.findById(match._id);
      expect(updatedMatch.availableSeats).toBe(100); // restored available seats

      expect(lockInternals.memoryStore.has(`seat:${seat._id}`)).toBe(false);
    });

    it('should return 400 for invalid signature', async () => {
      await request(app)
        .post('/api/v1/payment/webhook')
        .set('stripe-signature', 'invalid_sig')
        .send({ type: 'payment_intent.succeeded' })
        .expect(400);
    });

    it('should return 400 when signature header is missing', async () => {
      await request(app)
        .post('/api/v1/payment/webhook')
        .send({ type: 'payment_intent.succeeded' })
        .expect(400);
    });
  });
});
