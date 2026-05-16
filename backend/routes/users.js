const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, deactivateUser } = require('../controllers/userController');
const { protect, adminOnly } = require('../middlewares/auth');

router.use(protect, adminOnly);
router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deactivateUser);

module.exports = router;
