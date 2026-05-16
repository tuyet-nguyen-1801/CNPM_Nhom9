const express = require('express');
const router = express.Router();
const { getInvoices, getInvoice, createInvoice } = require('../controllers/invoiceController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getInvoices);
router.get('/:id', protect, getInvoice);
router.post('/', protect, createInvoice);

module.exports = router;
