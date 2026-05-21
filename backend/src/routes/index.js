const express = require('express');
const authRoutes = require('./authRoutes');
const matchRoutes = require('./matchRoutes');
const cartRoutes = require('./cartRoutes');
const paymentRoutes = require('./paymentRoutes');
const ticketRoutes = require('./ticketRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/matches', matchRoutes);
router.use('/cart', cartRoutes);
router.use('/payment', paymentRoutes);
router.use('/tickets', ticketRoutes);

module.exports = router;

