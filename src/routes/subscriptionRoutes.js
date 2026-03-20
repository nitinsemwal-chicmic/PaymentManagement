const express = require('express');
const router = express.Router();
const { createSubscription, cancelSubscription, mySubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/create', protect, createSubscription);
router.post('/cancel', protect, cancelSubscription);
router.get('/mysubscription', protect, mySubscription);

module.exports = router;