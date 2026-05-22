require('dotenv').config();

const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

jest.mock('../../services/ticketService', () => ({
  createTicketsForOrder: jest.fn(),
}));

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { Cart, Order, Payment, Seat, Match } = require('../../models');
const {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  _internals,
} = require('../../services/paymentService');

jest.setTimeout(120000);

describe('paymentService Unit Tests', () => {
  let mongod;
  let userId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-unit-payment' });
    await Promise.all([
      Cart.syncIndexes(),
      Order.syncIndexes(),
      Payment.syncIndexes(),
      Seat.syncIndexes(),
      Match.syncIndexes(),
    ]);
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId().toString();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all([
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({}),
      Seat.deleteMany({}),
      Match.deleteMany({}),
    ]);
  });

  describe('createPaymentIntent errors', () => {
    it('throws AppError 404 if cart is not found', async () => {
      const nonExistentCartId = new mongoose.Types.ObjectId().toString();
      await expect(createPaymentIntent(nonExistentCartId, userId)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Panier introuvable',
      });
    });

    it('throws AppError 403 if cart owner does not match userId', async () => {
      const cart = await Cart.create({
        userId: new mongoose.Types.ObjectId(), // different owner
        expiresAt: new Date(Date.now() + 60000),
        status: 'active',
        items: [{ matchId: new mongoose.Types.ObjectId(), seatId: new mongoose.Types.ObjectId(), price: 150 }],
      });

      await expect(createPaymentIntent(cart._id.toString(), userId)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Accès refusé',
      });
    });

    it('throws AppError 400 if cart is not active', async () => {
      const cart = await Cart.create({
        userId,
        expiresAt: new Date(Date.now() + 60000),
        status: 'confirmed', // not active
        items: [{ matchId: new mongoose.Types.ObjectId(), seatId: new mongoose.Types.ObjectId(), price: 150 }],
      });

      await expect(createPaymentIntent(cart._id.toString(), userId)).rejects.toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
        message: "Le panier n'est pas actif",
      });
    });

    it('throws AppError 400 if cart total amount is 0 or less', async () => {
      const cart = await Cart.create({
        userId,
        expiresAt: new Date(Date.now() + 60000),
        status: 'active',
        items: [], // 0 items = 0 amount
      });

      await expect(createPaymentIntent(cart._id.toString(), userId)).rejects.toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Le montant du panier doit être supérieur à 0',
      });
    });

    it('throws AppError 500 when Stripe API create payment intent fails', async () => {
      const cart = await Cart.create({
        userId,
        expiresAt: new Date(Date.now() + 60000),
        status: 'active',
        items: [{ matchId: new mongoose.Types.ObjectId(), seatId: new mongoose.Types.ObjectId(), price: 150 }],
      });

      mockStripe.paymentIntents.create.mockRejectedValueOnce(new Error('Stripe API error'));

      await expect(createPaymentIntent(cart._id.toString(), userId)).rejects.toMatchObject({
        status: 500,
        code: 'STRIPE_ERROR',
        message: 'Erreur Stripe : Stripe API error',
      });
    });
  });

  describe('confirmPayment errors', () => {
    it('throws AppError 500 when Stripe API retrieve payment intent fails', async () => {
      mockStripe.paymentIntents.retrieve.mockRejectedValueOnce(new Error('Stripe retrieve error'));

      await expect(confirmPayment('mock_cart_id', 'pi_123', userId)).rejects.toMatchObject({
        status: 500,
        code: 'STRIPE_ERROR',
        message: 'Erreur Stripe : Stripe retrieve error',
      });
    });

    it('throws AppError 400 when Stripe payment intent status is not succeeded', async () => {
      mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({
        id: 'pi_123',
        status: 'requires_payment_method',
      });

      await expect(confirmPayment('mock_cart_id', 'pi_123', userId)).rejects.toMatchObject({
        status: 400,
        code: 'PAYMENT_FAILED',
        message: "Le paiement n'a pas réussi (statut: requires_payment_method)",
      });
    });
  });

  describe('processPaymentSuccess edge cases', () => {
    it('throws AppError 404 if order does not exist', async () => {
      await expect(_internals.processPaymentSuccess('non-existent-pi')).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Commande introuvable',
      });
    });

    it('returns the order directly if it is already confirmed', async () => {
      const order = await Order.create({
        userId,
        totalAmount: 150,
        status: 'confirmed',
        stripePaymentIntentId: 'pi_confirmed_already',
      });

      const result = await _internals.processPaymentSuccess('pi_confirmed_already');
      expect(result._id.toString()).toBe(order._id.toString());
      expect(result.status).toBe('confirmed');
    });

    it('successfully updates order even if active cart is not found', async () => {
      const order = await Order.create({
        userId,
        totalAmount: 150,
        status: 'pending',
        stripePaymentIntentId: 'pi_no_cart',
      });

      // No cart created for userId with active status
      const result = await _internals.processPaymentSuccess('pi_no_cart');
      expect(result.status).toBe('confirmed');
    });
  });

  describe('processPaymentFailure edge cases', () => {
    it('returns without error if order is not found', async () => {
      await expect(_internals.processPaymentFailure('non-existent-pi')).resolves.toBeUndefined();
    });

    it('returns without error if order is already cancelled', async () => {
      const order = await Order.create({
        userId,
        totalAmount: 150,
        status: 'cancelled',
        stripePaymentIntentId: 'pi_already_cancelled',
      });

      await _internals.processPaymentFailure('pi_already_cancelled');
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('cancelled');
    });

    it('updates order to cancelled even if active cart is not found', async () => {
      const order = await Order.create({
        userId,
        totalAmount: 150,
        status: 'pending',
        stripePaymentIntentId: 'pi_failed_no_cart',
      });

      await _internals.processPaymentFailure('pi_failed_no_cart');
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('cancelled');
    });
  });

  describe('handleWebhook', () => {
    it('throws AppError 400 if webhook signature construction fails', async () => {
      mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      await expect(handleWebhook(Buffer.from('{}'), 'invalid_sig')).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_SIGNATURE',
        message: 'Signature de webhook invalide : Invalid signature',
      });
    });

    it('supports STRIPE_WEBHOOK_SECRET environment fallback', async () => {
      const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      process.env.STRIPE_WEBHOOK_SECRET = 'configured_webhook_secret';

      mockStripe.webhooks.constructEvent.mockReturnValueOnce({
        type: 'customer.created',
        data: { object: {} },
      });

      const res = await handleWebhook(Buffer.from('{}'), 'sig');
      expect(res).toEqual({ received: true });
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        'sig',
        'configured_webhook_secret'
      );

      process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    });

    it('supports mock webhook secret fallback when environment variable is undefined', async () => {
      const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      mockStripe.webhooks.constructEvent.mockReturnValueOnce({
        type: 'customer.created',
        data: { object: {} },
      });

      const res = await handleWebhook(Buffer.from('{}'), 'sig');
      expect(res).toEqual({ received: true });
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        'sig',
        'mock_webhook_secret'
      );

      process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    });

    it('processes webhook event for payment_intent.succeeded', async () => {
      const order = await Order.create({
        userId,
        totalAmount: 150,
        status: 'pending',
        stripePaymentIntentId: 'pi_webhook_success',
      });

      mockStripe.webhooks.constructEvent.mockReturnValueOnce({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_webhook_success' } },
      });

      const res = await handleWebhook(Buffer.from('{}'), 'sig');
      expect(res).toEqual({ received: true });

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('confirmed');
    });

    it('processes webhook event for payment_intent.payment_failed', async () => {
      const order = await Order.create({
        userId,
        totalAmount: 150,
        status: 'pending',
        stripePaymentIntentId: 'pi_webhook_failure',
      });

      mockStripe.webhooks.constructEvent.mockReturnValueOnce({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_webhook_failure' } },
      });

      const res = await handleWebhook(Buffer.from('{}'), 'sig');
      expect(res).toEqual({ received: true });

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('cancelled');
    });
  });

  describe('Mock Mode Tests', () => {
    let originalNodeEnv;
    let originalStripeKey;

    beforeAll(() => {
      originalNodeEnv = process.env.NODE_ENV;
      originalStripeKey = process.env.STRIPE_SECRET_KEY;
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.STRIPE_SECRET_KEY = originalStripeKey;
    });

    it('uses mock payment intent creation in development mode with startsWith mock key', async () => {
      process.env.NODE_ENV = 'development';
      process.env.STRIPE_SECRET_KEY = 'mock_stripe_key';

      const cart = await Cart.create({
        userId,
        expiresAt: new Date(Date.now() + 60000),
        status: 'active',
        items: [{ matchId: new mongoose.Types.ObjectId(), seatId: new mongoose.Types.ObjectId(), price: 200 }],
      });

      const result = await createPaymentIntent(cart._id.toString(), userId);
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('paymentIntentId');
      expect(result.paymentIntentId).toContain('pi_mock_');
    });

    it('uses mock payment intent creation in development mode with sk_test_... key', async () => {
      process.env.NODE_ENV = 'development';
      process.env.STRIPE_SECRET_KEY = 'sk_test_...';

      const cart = await Cart.create({
        userId,
        expiresAt: new Date(Date.now() + 60000),
        status: 'active',
        items: [{ matchId: new mongoose.Types.ObjectId(), seatId: new mongoose.Types.ObjectId(), price: 200 }],
      });

      const result = await createPaymentIntent(cart._id.toString(), userId);
      expect(result.paymentIntentId).toContain('pi_mock_');
    });

    it('uses mock payment intent creation in development mode with empty key', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.STRIPE_SECRET_KEY;

      const cart = await Cart.create({
        userId,
        expiresAt: new Date(Date.now() + 60000),
        status: 'active',
        items: [{ matchId: new mongoose.Types.ObjectId(), seatId: new mongoose.Types.ObjectId(), price: 200 }],
      });

      const result = await createPaymentIntent(cart._id.toString(), userId);
      expect(result.paymentIntentId).toContain('pi_mock_');
    });

    it('uses mock confirmation in development mode', async () => {
      process.env.NODE_ENV = 'development';
      process.env.STRIPE_SECRET_KEY = 'mock_stripe_key';

      const order = await Order.create({
        userId,
        totalAmount: 200,
        status: 'pending',
        stripePaymentIntentId: 'pi_mock_confirm_xyz',
      });

      await Cart.create({
        userId,
        expiresAt: new Date(Date.now() + 60000),
        status: 'active',
        items: [{ matchId: new mongoose.Types.ObjectId(), seatId: new mongoose.Types.ObjectId(), price: 200 }],
      });

      // Cover confirmPayment when userId is falsy/not provided
      const result = await confirmPayment('mock_cart_id', 'pi_mock_confirm_xyz');
      expect(result).toHaveProperty('orderId');
      expect(result.orderId).toBe(order._id.toString());
    });
  });
});
