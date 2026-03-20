const express = require('express');
const router = express.Router();
const {protect} = require('../middlewares/authMiddleware.js');
const { paymentLimiter } = require('../middlewares/rateLimitMiddleware.js');
const { createPaymentIntent, getPaymentHistory } = require('../controllers/paymentController.js');

router.post('/createPaymentIntent', protect, paymentLimiter, createPaymentIntent);
router.get('/paymentHistory', protect, getPaymentHistory);

module.exports = router;