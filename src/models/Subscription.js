const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    stripeSubscriptionId: {
        type: String,
        required: true,
        unique: true
    },
    planName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'paused']
    },
    currentPeriodEnd: {
        type: Date,
        required: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
