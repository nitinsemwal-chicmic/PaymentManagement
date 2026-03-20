const express = require('express');
const router = express.Router();
const {registerUser, loginUser, getUserProfile, logoutUser} = require('../controllers/authController.js');
const {protect} = require('../middlewares/authMiddleware.js');
const { RegisterSchema, LoginSchema } = require('../validations/Validate.Authentication.js');
const validate = require('../middlewares/validateMiddleware.js');

router.post('/register', validate(RegisterSchema), registerUser);
router.post('/login', validate(LoginSchema), loginUser);
router.post('/logout', logoutUser);
router.get('/profile', protect,getUserProfile);

module.exports = router;