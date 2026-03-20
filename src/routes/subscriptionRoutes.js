const express = require('express');
const router = express.Router();
const { createSubscription, cancelSubscription, mySubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middlewares/authMiddleware');
const { paymentLimiter } = require('../middlewares/rateLimitMiddleware.js');

router.post('/create', protect, paymentLimiter, createSubscription);
router.post('/cancel', protect, cancelSubscription);
router.get('/mysubscription', protect, mySubscription);

module.exports = router;