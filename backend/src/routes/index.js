const express = require('express');
const authRoutes = require('./authRoutes');
const matchRoutes = require('./matchRoutes');
const cartRoutes = require('./cartRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/matches', matchRoutes);
router.use('/cart', cartRoutes);

module.exports = router;

