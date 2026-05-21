const mongoose = require('mongoose');
const { Order, Ticket } = require('../models');
const { AppError } = require('./authService');

/**
 * Get all orders for a user with populated ticket and match info.
 *
 * @param {string} userId
 * @returns {Promise<Array>} List of orders with tickets
 */
async function getOrders(userId) {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });
  
  const ordersWithTickets = await Promise.all(
    orders.map(async (order) => {
      const tickets = await Ticket.find({ orderId: order._id })
        .populate({
          path: 'matchId',
          populate: { path: 'stadiumId' },
        })
        .populate('seatId');
      return {
        ...order.toObject(),
        tickets,
      };
    })
  );

  return ordersWithTickets;
}

/**
 * Get a specific order by ID, ensuring user ownership or admin role.
 *
 * @param {string} orderId
 * @param {string} userId
 * @param {string} userRole
 * @returns {Promise<object>} Order details with tickets
 */
async function getOrder(orderId, userId, userRole) {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError(400, 'Format d\'identifiant de commande invalide', 'INVALID_INPUT');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError(404, 'Commande introuvable', 'NOT_FOUND');
  }

  if (order.userId.toString() !== userId && userRole !== 'admin') {
    throw new AppError(403, 'Accès refusé', 'FORBIDDEN');
  }

  const tickets = await Ticket.find({ orderId: order._id })
    .populate({
      path: 'matchId',
      populate: { path: 'stadiumId' },
    })
    .populate('seatId');

  return {
    ...order.toObject(),
    tickets,
  };
}

module.exports = {
  getOrders,
  getOrder,
};
