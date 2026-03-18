const express = require('express');
const router = express.Router();
const {registerUser, loginUser, getUserProfile, logoutUser} = require('../controllers/authController.js');
const {protect} = require('../middlewares/authMiddleware.js');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/profile', protect,getUserProfile);

module.exports = router;