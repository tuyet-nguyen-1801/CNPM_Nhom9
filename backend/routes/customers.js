const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, registerCustomer, changeCustomerPassword, loginCustomer, getMyOrders } = require('../controllers/customerController');
const { protect, adminOnly, customerOnly } = require('../middlewares/auth');

router.post('/register', registerCustomer);
router.post('/login', loginCustomer);
router.put('/change-password', changeCustomerPassword);
router.get('/my-orders', protect, customerOnly, getMyOrders);
router.get('/', protect, getCustomers);
router.get('/:id', protect, getCustomer);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, adminOnly, deleteCustomer);

module.exports = router;
