const { v4: uuidv4 } = require('uuid');
const { Ticket, Match, Seat, User } = require('../models');
const { generateQR } = require('../utils/qrGenerator');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { uploadPDF } = require('../utils/blobStorage');
const { sendTicketEmail } = require('./emailService');
const { unlockSeat } = require('./seatLockService');
const { AppError } = require('./authService');

/**
 * Helper to verify ownership or admin rights to access a ticket.
 */
async function verifyTicketAccess(ticketId, userId, userRole) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'Billet introuvable', 'NOT_FOUND');
  }

  if (ticket.userId.toString() !== userId && userRole !== 'admin') {
    throw new AppError(403, 'Accès refusé', 'FORBIDDEN');
  }

  return ticket;
}

/**
 * Generates tickets for a confirmed order following the strict 7-step sequence:
 * 1. INSERT Order (handled upstream in payment confirmation)
 * 2. INSERT Ticket with unique qrCode uuid
 * 3. generateQR(ticket.id) -> base64
 * 4. generateTicketPDF(ticket, qrCode) -> buffer
 * 5. uploadToBlobStorage(pdf) -> url
 * 6. sendEmail(user.email, url)
 * 7. DEL seat:{seatId} from Redis & mark seat as sold in DB
 *
 * @param {object} order  Mongoose Order document
 * @param {Array} cartItems  Array of cart items
 */
async function createTicketsForOrder(order, cartItems) {
  const user = await User.findById(order.userId);
  if (!user) {
    throw new AppError(404, 'Utilisateur introuvable', 'NOT_FOUND');
  }

  for (const item of cartItems) {
    const match = await Match.findById(item.matchId).populate('stadiumId');
    const seat = await Seat.findById(item.seatId);

    if (!match || !seat) {
      throw new AppError(404, 'Match ou Siège introuvable pour la génération du billet', 'NOT_FOUND');
    }

    // Step 2: INSERT Ticket
    const qrCodeUuid = uuidv4();
    const ticket = await Ticket.create({
      orderId: order._id,
      matchId: item.matchId,
      seatId: item.seatId,
      userId: order.userId,
      qrCode: qrCodeUuid,
      status: 'valid',
    });

    // Step 3: generateQR
    const qrBase64 = await generateQR(ticket._id.toString());

    // Step 4: generatePDF
    const pdfBuffer = await generateTicketPDF(ticket, qrBase64, match, seat);

    // Step 5: uploadPDF
    const pdfUrl = await uploadPDF(pdfBuffer, `${ticket._id}.pdf`);

    ticket.pdfUrl = pdfUrl;
    await ticket.save();

    // Step 6: sendEmail
    await sendTicketEmail(user.email, pdfUrl, { ticket, match, seat });

    // Step 7: DEL seat lock from Redis & mark seat as sold in DB
    await unlockSeat(item.seatId.toString()).catch(() => {});
    seat.status = 'sold';
    await seat.save();
  }
}

/**
 * Get QR code base64 image data URL.
 *
 * @param {string} ticketId
 * @param {string} userId
 * @param {string} userRole
 * @returns {Promise<string>} QR base64 string
 */
async function getTicketQR(ticketId, userId, userRole) {
  const ticket = await verifyTicketAccess(ticketId, userId, userRole);
  return await generateQR(ticket._id.toString());
}

module.exports = {
  createTicketsForOrder,
  verifyTicketAccess,
  getTicketQR,
};
