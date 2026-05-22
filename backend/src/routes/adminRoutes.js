const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

// Enforce authMiddleware and adminMiddleware for all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/matches', adminController.getAllMatches);
router.post('/matches', adminController.createMatch);
router.put('/matches/:id', adminController.updateMatch);
router.delete('/matches/:id', adminController.deactivateMatch);
router.get('/stadiums', adminController.getAllStadiums);
router.get('/stats', adminController.getSalesStats);
router.get('/export', adminController.exportSalesCSV);

module.exports = router;
