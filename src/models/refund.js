const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true,
        unique: true
    },

    stripe: {
        refundId: { type: String, unique: true, sparse: true },
        paymentIntentId: { type: String, required: true }
    },

    paymentType: {
        type: String,
        enum: ['one-time', 'subscription'],
        required: true
    },

    amount: {
        original: { type: Number, required: true },
        refund: { type: Number, required: true },
        percentage: { type: Number, required: true }
    },

    currency: {
        type: String,
        default: 'usd'
    },

    refundTier: {
        type: String,
        enum: ['full', 'partial_80', 'partial_50'],
        required: true
    },

    status: {
        type: String,
        enum: ['pending', 'succeeded', 'failed', 'canceled'],
        default: 'pending'
    },

    reason: {
        type: String,
        trim: true,
        maxlength: 500
    },

    processedAt: Date
}, {
    timestamps: true
});

refundSchema.index({ userId: 1, createdAt: -1 });
refundSchema.index({ 'stripe.paymentIntentId': 1 });

module.exports = mongoose.model('Refund', refundSchema);