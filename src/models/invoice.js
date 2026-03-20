const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    stripeInvoiceId: {
        type: String,
        required: true,
        unique: true
    },
    stripeCustomerId: String,
    subscriptionId: {
        type: String
    },
    amountPaid: Number,
    currency: String,
    status: String, // paid, open, void, uncollectible
    invoicePdf: String, // Stripe link
    hostedInvoiceUrl: String, // Stripe invoice page
    billingReason: String, // subscription_create, cycle, manual
    createdAt: {
        type: Date,
        default: Date.now
    }
});

invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ stripeCustomerId: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
