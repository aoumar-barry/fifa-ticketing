const orderService = require('../services/orderService');

/**
 * Get the authenticated user's order history.
 */
async function getOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const orders = await orderService.getOrders(userId);
    res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
}

/**
 * Get details of a specific order.
 */
async function getOrder(req, res, next) {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await orderService.getOrder(orderId, userId, userRole);
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrders,
  getOrder,
};
