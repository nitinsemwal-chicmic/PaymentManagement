const Invoice = require('../models/invoice');
const stripe = require('../config/stripe');
const User = require('../models/User');
const STATUS = require('../constants/statusCodes');
const MSG = require('../constants/errorMessages');

const getUserInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const invoices = await Invoice.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email name');

    const total = await Invoice.countDocuments({ userId: req.user._id });
    console.log('Total',total);

    res.status(STATUS.SUCCESS).json({
      invoices,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
  }
};

// Get single invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findOne({ 
      _id: id, 
      userId: req.user._id 
    }).populate('userId', 'email name');

    if (!invoice) {
      return res.status(STATUS.NOT_FOUND).json({ 
        message: 'Invoice not found' 
      });
    }

    res.status(STATUS.SUCCESS).json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
  }
};

// Download invoice PDF - redirects to Stripe hosted PDF
const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findOne({ 
      _id: id, 
      userId: req.user._id 
    });

    if (!invoice || !invoice.invoicePdf) {
      return res.status(STATUS.NOT_FOUND).json({ 
        message: 'Invoice PDF not available' 
      });
    }

    // Redirect to Stripe PDF URL
    res.redirect(invoice.invoicePdf);
    
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
  }
};

module.exports = {
  getUserInvoices,
  getInvoiceById,
  downloadInvoice
};
