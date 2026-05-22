const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'mock_stripe_key');
const { Order, Payment, Cart, Seat, Match } = require('../models');
const { unlockSeat } = require('./seatLockService');
const { AppError } = require('./authService');

const isMockMode = process.env.NODE_ENV !== 'test' && (
  !process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET_KEY.startsWith('mock') ||
  process.env.STRIPE_SECRET_KEY === 'sk_test_...'
);

/**
 * Create a Stripe PaymentIntent for the active cart.
 *
 * @param {string} cartId
 * @param {string} userId
 * @returns {Promise<{clientSecret: string, paymentIntentId: string}>}
 */
async function createPaymentIntent(cartId, userId) {
  const cart = await Cart.findById(cartId);

  if (!cart) {
    throw new AppError(404, 'Panier introuvable', 'NOT_FOUND');
  }
  if (cart.userId.toString() !== userId) {
    throw new AppError(403, 'Accès refusé', 'FORBIDDEN');
  }
  if (cart.status !== 'active') {
    throw new AppError(400, 'Le panier n\'est pas actif', 'BAD_REQUEST');
  }

  // Calculate total amount in dollars
  const amount = cart.items.reduce((sum, item) => sum + item.price, 0);
  if (amount <= 0) {
    throw new AppError(400, 'Le montant du panier doit être supérieur à 0', 'BAD_REQUEST');
  }

  // Create Stripe PaymentIntent
  let paymentIntent;
  if (isMockMode) {
    const mockId = `pi_mock_${Math.random().toString(36).substring(2, 11)}`;
    paymentIntent = {
      id: mockId,
      client_secret: `${mockId}_secret_${Math.random().toString(36).substring(2, 11)}`,
      amount: Math.round(amount * 100),
      currency: 'usd',
      status: 'requires_payment_method',
      metadata: {
        cartId: cartId.toString(),
        userId: userId.toString(),
      },
    };
  } else {
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert to cents
        currency: 'usd',
        metadata: {
          cartId: cartId.toString(),
          userId: userId.toString(),
        },
      });
    } catch (err) {
      throw new AppError(500, `Erreur Stripe : ${err.message}`, 'STRIPE_ERROR');
    }
  }

  // Create Order in pending state
  const order = await Order.create({
    userId,
    totalAmount: amount,
    status: 'pending',
    stripePaymentIntentId: paymentIntent.id,
  });

  // Create Payment in pending state
  await Payment.create({
    orderId: order._id,
    amount,
    currency: 'usd',
    method: 'STRIPE',
    status: 'pending',
    transactionId: paymentIntent.id,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Confirms payment and processes order logic.
 * Primarily used for direct client confirmation flow.
 *
 * @param {string} cartId
 * @param {string} paymentIntentId
 * @param {string} userId
 * @returns {Promise<{orderId: string}>}
 */
async function confirmPayment(cartId, paymentIntentId, userId) {
  // Retrieve the payment intent from Stripe to verify status
  if (userId) {
    // Keep reference to satisfy eslint and potential future authorization checks
  }
  let paymentIntent;
  if (isMockMode) {
    paymentIntent = {
      id: paymentIntentId,
      status: 'succeeded',
      amount: 15000,
      currency: 'usd',
    };
  } else {
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (err) {
      throw new AppError(500, `Erreur Stripe : ${err.message}`, 'STRIPE_ERROR');
    }
  }

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(400, `Le paiement n'a pas réussi (statut: ${paymentIntent.status})`, 'PAYMENT_FAILED');
  }

  const order = await processPaymentSuccess(paymentIntentId);

  return {
    orderId: order._id.toString(),
  };
}

/**
 * Handle Stripe webhook event.
 *
 * @param {Buffer} rawBody
 * @param {string} signature
 * @returns {Promise<{received: boolean}>}
 */
async function handleWebhook(rawBody, signature) {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || 'mock_webhook_secret'
    );
  } catch (err) {
    throw new AppError(400, `Signature de webhook invalide : ${err.message}`, 'INVALID_SIGNATURE');
  }

  const paymentIntent = event.data.object;

  if (event.type === 'payment_intent.succeeded') {
    await processPaymentSuccess(paymentIntent.id);
  } else if (event.type === 'payment_intent.payment_failed') {
    await processPaymentFailure(paymentIntent.id);
  }

  return { received: true };
}

/**
 * Internal logic for successful payment. Updates Order, Payment, Cart, and Seats.
 *
 * @param {string} paymentIntentId
 * @returns {Promise<object>} Order document
 */
async function processPaymentSuccess(paymentIntentId) {
  const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!order) {
    throw new AppError(404, 'Commande introuvable', 'NOT_FOUND');
  }

  if (order.status === 'confirmed') {
    return order; // Already processed
  }

  // Update order status
  order.status = 'confirmed';
  await order.save();

  // Update payment status
  await Payment.findOneAndUpdate(
    { transactionId: paymentIntentId },
    { status: 'succeeded' }
  );

  // Retrieve active cart and confirm it
  const cart = await Cart.findOne({ userId: order.userId, status: 'active' });
  if (cart) {
    cart.status = 'confirmed';
    await cart.save();

    // Generate tickets and finalize seat status (unlocking Redis and marking as sold)
    const ticketService = require('./ticketService');
    await ticketService.createTicketsForOrder(order, cart.items);
  }

  return order;
}

/**
 * Internal logic for failed payment. Updates Order, Payment, Cart, and Seats.
 *
 * @param {string} paymentIntentId
 */
async function processPaymentFailure(paymentIntentId) {
  const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!order) return;

  if (order.status === 'cancelled') return;

  // Update order status to cancelled
  order.status = 'cancelled';
  await order.save();

  // Update payment status to failed
  await Payment.findOneAndUpdate(
    { transactionId: paymentIntentId },
    { status: 'failed' }
  );

  // Retrieve active cart, mark as expired and release locks/seats
  const cart = await Cart.findOne({ userId: order.userId, status: 'active' });
  if (cart) {
    cart.status = 'expired';
    await cart.save();

    for (const item of cart.items) {
      await Seat.findByIdAndUpdate(item.seatId, { status: 'available' });
      await unlockSeat(item.seatId.toString()).catch(() => {});
      await Match.findByIdAndUpdate(item.matchId, { $inc: { availableSeats: 1 } }).catch(() => {});
    }
  }
}

module.exports = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  _internals: {
    processPaymentSuccess,
    processPaymentFailure,
  },
};
