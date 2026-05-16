const express = require('express');
const router = express.Router();
const { getInventory, getTransactions, importStock, adjustStock } = require('../controllers/inventoryController');
const { protect, adminOnly } = require('../middlewares/auth');

router.get('/', protect, getInventory);
router.get('/transactions', protect, getTransactions);
router.post('/import', protect, importStock);
router.put('/:phone_id/adjust', protect, adminOnly, adjustStock);

module.exports = router;
