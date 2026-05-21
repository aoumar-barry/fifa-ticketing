const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Webhook does NOT require authentication and operates on raw body
router.post('/webhook', paymentController.handleWebhook);

// Protected routes
router.post('/intent', authMiddleware, paymentController.createPaymentIntent);
router.post('/confirm', authMiddleware, paymentController.confirmPayment);

module.exports = router;
