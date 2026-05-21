const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const cartController = require('../controllers/cartController');

const router = express.Router();

// All cart routes require authentication
router.use(authMiddleware);

router.post('/', cartController.createCart);
router.get('/:id', cartController.getCart);
router.delete('/:id', cartController.deleteCart);

module.exports = router;
