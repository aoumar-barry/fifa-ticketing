const { z } = require('zod');
const cartService = require('../services/cartService');
const { AppError } = require('../services/authService');

const createCartSchema = z.object({
  matchId: z.string().min(1, 'matchId est requis'),
  seatId: z.string().min(1, 'seatId est requis'),
});

async function createCart(req, res, next) {
  try {
    const parsed = createCartSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      throw new AppError(400, errorMsg, 'VALIDATION_ERROR');
    }

    const { matchId, seatId } = parsed.data;
    const result = await cartService.createCart(
      req.user._id.toString(),
      matchId,
      seatId,
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function getCart(req, res, next) {
  try {
    const cart = await cartService.getCart(
      req.params.id,
      req.user._id.toString(),
    );
    res.status(200).json(cart);
  } catch (err) {
    next(err);
  }
}

async function deleteCart(req, res, next) {
  try {
    await cartService.deleteCart(
      req.params.id,
      req.user._id.toString(),
    );
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCart,
  getCart,
  deleteCart,
};
