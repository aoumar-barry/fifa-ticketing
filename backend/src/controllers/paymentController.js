const { z } = require('zod');
const paymentService = require('../services/paymentService');
const { AppError } = require('../services/authService');

const createIntentSchema = z.object({
  cartId: z.string().min(1, 'cartId est requis'),
});

const confirmPaymentSchema = z.object({
  cartId: z.string().min(1, 'cartId est requis'),
  paymentIntentId: z.string().min(1, 'paymentIntentId est requis'),
});

/**
 * Endpoint to create a payment intent.
 */
async function createPaymentIntent(req, res, next) {
  try {
    const { cartId } = createIntentSchema.parse(req.body);
    const result = await paymentService.createPaymentIntent(cartId, req.user.id);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(400, err.errors[0].message, 'VALIDATION_ERROR'));
    }
    next(err);
  }
}

/**
 * Endpoint to confirm payment.
 */
async function confirmPayment(req, res, next) {
  try {
    const { cartId, paymentIntentId } = confirmPaymentSchema.parse(req.body);
    const result = await paymentService.confirmPayment(cartId, paymentIntentId, req.user.id);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(400, err.errors[0].message, 'VALIDATION_ERROR'));
    }
    next(err);
  }
}

/**
 * Endpoint to handle Stripe webhooks.
 */
async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      throw new AppError(400, 'Signature Stripe manquante', 'BAD_REQUEST');
    }
    // req.body should be raw buffer here
    const result = await paymentService.handleWebhook(req.body, signature);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
};
