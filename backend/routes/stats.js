const express = require('express');
const router = express.Router();
const { getDashboard, getRevenue } = require('../controllers/statsController');
const { protect } = require('../middlewares/auth');

router.get('/dashboard', protect, getDashboard);
router.get('/revenue', protect, getRevenue);

module.exports = router;
