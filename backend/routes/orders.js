const express = require('express');
const router = express.Router();
const { getOrders, getOrder, createOrder, updateOrderStatus, cancelOrder } = require('../controllers/orderController');
const { protect, adminOnly } = require('../middlewares/auth');

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);
router.post('/', protect, createOrder);
router.put('/:id/status', protect, updateOrderStatus);
router.delete('/:id', protect, adminOnly, cancelOrder);

module.exports = router;
