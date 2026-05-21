const express = require('express');
const authRoutes = require('./authRoutes');
const matchRoutes = require('./matchRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/matches', matchRoutes);

module.exports = router;
