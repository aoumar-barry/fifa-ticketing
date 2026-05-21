const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const ticketController = require('../controllers/ticketController');

const router = express.Router();

// Protected routes to download/stream PDF and fetch QR base64
router.get('/:id/pdf', authMiddleware, ticketController.getTicketPDF);
router.get('/:id/qr', authMiddleware, ticketController.getTicketQR);

module.exports = router;
