const express = require('express');
const authRoutes = require('./authRoutes');
const matchRoutes = require('./matchRoutes');
const cartRoutes = require('./cartRoutes');
const paymentRoutes = require('./paymentRoutes');
const ticketRoutes = require('./ticketRoutes');
const orderRoutes = require('./orderRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/matches', matchRoutes);
router.use('/cart', cartRoutes);
router.use('/payment', paymentRoutes);
router.use('/tickets', ticketRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

module.exports = router;


