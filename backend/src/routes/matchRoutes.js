const express = require('express');
const matchController = require('../controllers/matchController');

const router = express.Router();

router.get('/', matchController.listMatches);
router.get('/:id', matchController.getMatch);
router.get('/:id/seats', matchController.getMatchSeats);

module.exports = router;
