const express = require('express');
const router = express.Router();
const { createPaymentIntent, getPaymentHistory } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/createPaymentIntent', protect, createPaymentIntent);
router.get('/paymentHistory', protect, getPaymentHistory);

module.exports = router;