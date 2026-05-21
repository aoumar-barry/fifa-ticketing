const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.registerLocal);
router.post('/login', authController.loginLocal);
router.post('/refresh', authController.refreshTokens);
router.post('/logout', authController.logout);
router.post('/firebase', authController.loginFirebase);

module.exports = router;
