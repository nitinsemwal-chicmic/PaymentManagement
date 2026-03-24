const mongoose = require('mongoose');
const stripe = require('../config/stripe');
const Refund = require('../models/refund');
const Transaction = require('../models/Transaction');
const { getRefundPolicy, calculateRefundAmount } = require('../utils/refundPolicy');
const STATUS = require('../constants/statusCodes');
const MSG = require('../constants/errorMessages');

const findTransaction = async (id, userId) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { stripePaymentIntentId: id };
    return Transaction.findOne({ ...query, userId });
};

const requestRefund = async (req, res) => {
    try {
        const { transactionId, reason } = req.body;
        if (!transactionId) {
            return res.status(STATUS.BAD_REQUEST).json({ message: 'transactionId is required.' });
        }

        const transaction = await findTransaction(transactionId, req.user._id);
        if (!transaction) {
            return res.status(STATUS.NOT_FOUND).json({ message: 'Transaction not found.' });
        }

        if (transaction.status !== 'succeeded') {
            return res.status(STATUS.BAD_REQUEST).json({ message: `Cannot refund a transaction with status "${transaction.status}".` });
        }

        if (await Refund.exists({ transactionId: transaction._id })) {
            return res.status(STATUS.BAD_REQUEST).json({ message: 'A refund for this transaction already exists.' });
        }

        const policy = getRefundPolicy(transaction.type, transaction.createdAt);
        if (!policy.eligible) {
            return res.status(STATUS.BAD_REQUEST).json({ message: policy.reason });
        }

        const refundAmount = calculateRefundAmount(transaction.amount, policy.percentage);

        const stripeRefund = await stripe.refunds.create({
            payment_intent: transaction.stripePaymentIntentId,
            amount: Math.round(refundAmount * 100),
            reason: 'requested_by_customer',
            metadata: {
                userId: req.user._id.toString(),
                transactionId: transaction._id.toString(),
                tier: policy.tier
            }
        });

        const refund = await Refund.create({
            userId: req.user._id,
            transactionId: transaction._id,
            stripe: {
                refundId: stripeRefund.id,
                paymentIntentId: transaction.stripePaymentIntentId
            },
            paymentType: transaction.type,
            amount: {
                original: transaction.amount,
                refund: refundAmount,
                percentage: policy.percentage
            },
            refundTier: policy.tier,
            currency: transaction.currency,
            status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
            reason: reason || null,
            processedAt: stripeRefund.status === 'succeeded' ? new Date() : null
        });

        await Transaction.findByIdAndUpdate(transaction._id, { status: 'refunded' });

        return res.status(STATUS.SUCCESS).json({
            message: `Refund initiated successfully. ${policy.reason}`,
            refund
        });
    } catch (error) {
        console.error('Refund Request Error:', error);
        res.status(STATUS.BAD_REQUEST).json({ message: error.message || MSG.SERVER_ERROR });
    }
};

const getUserRefunds = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const refunds = await Refund.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('transactionId', 'amount currency type');

        const total = await Refund.countDocuments({ userId: req.user._id });
        res.json({ refunds, total, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
    }
};

const getRefundById = async (req, res) => {
    try {
        const id = req.params.id;
        const isObjectId = mongoose.Types.ObjectId.isValid(id);
        const query = isObjectId ? { _id: id } : { 'stripe.refundId': id };

        const refund = await Refund.findOne({ ...query, userId: req.user._id })
            .populate('transactionId');

        if (!refund) return res.status(STATUS.NOT_FOUND).json({ message: 'Refund not found.' });
        res.json(refund);
    } catch (error) {
        console.log("Error while Getting Refunds by Id :", error);
        res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
    }
};

const checkEligibility = async (req, res) => {
    try {
        const transaction = await findTransaction(req.params.transactionId, req.user._id);
        if (!transaction) return res.status(STATUS.NOT_FOUND).json({ message: 'Transaction not found.' });

        const existingRefund = await Refund.findOne({ transactionId: transaction._id });
        if (existingRefund) {
            return res.status(STATUS.SUCCESS).json({
                eligible: false,
                reason: `This transaction has already been refunded (status: ${existingRefund.status}).`,
                existingRefund: { id: existingRefund._id, status: existingRefund.status }
            });
        }

        if (transaction.status !== 'succeeded') {
            return res.status(STATUS.SUCCESS).json({
                eligible: false,
                reason: `Transaction status is "${transaction.status}" — only succeeded transactions can be refunded.`
            });
        }

        const policy = getRefundPolicy(transaction.type, transaction.createdAt);
        const refundAmount = policy.eligible ? calculateRefundAmount(transaction.amount, policy.percentage) : 0;

        return res.status(STATUS.SUCCESS).json({
            eligible: policy.eligible,
            reason: policy.reason,
            paymentType: transaction.type,
            originalAmount: transaction.amount,
            refundAmount,
            refundPercentage: policy.percentage,
            refundTier: policy.tier,
            currency: transaction.currency
        });
    } catch (error) {
        console.error('Error checking refund eligibility:', error);
        return res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
    }
};

module.exports = { requestRefund, getUserRefunds, getRefundById, checkEligibility };
