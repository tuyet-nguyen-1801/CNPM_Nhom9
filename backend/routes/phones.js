const express = require('express');
const router = express.Router();
const { getPhones, getPhone, createPhone, updatePhone, deletePhone } = require('../controllers/phoneController');
const { protect, adminOnly } = require('../middlewares/auth');

router.get('/', protect, getPhones);
router.get('/:id', protect, getPhone);
router.post('/', protect, adminOnly, createPhone);
router.put('/:id', protect, adminOnly, updatePhone);
router.delete('/:id', protect, adminOnly, deletePhone);

module.exports = router;
