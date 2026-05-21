const fs = require('fs');
const path = require('path');
const ticketService = require('../services/ticketService');
const { AppError } = require('../services/authService');

/**
 * Download or stream ticket PDF.
 */
async function getTicketPDF(req, res, next) {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await ticketService.verifyTicketAccess(ticketId, userId, userRole);

    // If PDF exists locally on disk, stream it
    const localFilePath = path.join(__dirname, '../../public/tickets', `${ticket._id}.pdf`);
    if (fs.existsSync(localFilePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket._id}.pdf"`);
      return fs.createReadStream(localFilePath).pipe(res);
    }

    // Fallback: redirect to public Azure URL
    if (ticket.pdfUrl) {
      return res.redirect(ticket.pdfUrl);
    }

    throw new AppError(404, 'Fichier PDF du billet introuvable', 'NOT_FOUND');
  } catch (err) {
    next(err);
  }
}

/**
 * Get ticket QR code base64.
 */
async function getTicketQR(req, res, next) {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const qrCode = await ticketService.getTicketQR(ticketId, userId, userRole);
    res.status(200).json({ qrCode });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTicketPDF,
  getTicketQR,
};
