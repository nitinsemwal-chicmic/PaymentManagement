const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware.js');
const { requestRefund, getUserRefunds, getRefundById, checkEligibility } = require('../controllers/refundController.js');

router.post('/request', protect, requestRefund);
router.get('/', protect, getUserRefunds);
router.get('/:id', protect, getRefundById);
router.get('/checkEligibility/:transactionId', protect, checkEligibility);

module.exports = router;
