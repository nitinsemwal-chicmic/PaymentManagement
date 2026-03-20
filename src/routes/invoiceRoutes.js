const express = require('express');
const router = express.Router();
const { getUserInvoices, getInvoiceById, downloadInvoice } = require('../controllers/invoiceController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getUserInvoices);
router.get('/:id', protect, getInvoiceById);
router.get('/:id/download', protect, downloadInvoice);

module.exports = router;