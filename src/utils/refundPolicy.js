const REFUND_CONFIG = {
    'one-time': {
        eligible: true,
        percentage: 80,
        tier: 'partial_80',
        reason: 'One-time payments are always Partial refundable.'
    },
    subscription: [
        { maxHours: 6, percentage: 100, tier: 'full', label: 'within 6 hours (full refund)' },
        { maxHours: 24, percentage: 80, tier: 'partial_80', label: 'within 24 hours (80% refund)' },
        { maxHours: 168, percentage: 50, tier: 'partial_50', label: 'within 7 days (50% refund)' },
    ]
};

const getRefundPolicy = (paymentType, paymentDate) => {
    if (paymentType === 'one-time') return REFUND_CONFIG['one-time'];

    const hoursSince = (Date.now() - new Date(paymentDate)) / 3.6e6;
    const policy = REFUND_CONFIG.subscription.find(p => hoursSince <= p.maxHours);

    if (policy) {
        return {
            eligible: true,
            percentage: policy.percentage,
            tier: policy.tier,
            reason: `Subscription payment requested ${policy.label}.`
        };
    }

    return {
        eligible: false,
        percentage: 0,
        tier: null,
        reason: 'Subscription refund window has expired (more than 7 days since payment).'
    };
};

const calculateRefundAmount = (amount, percentage) => Math.round(amount * percentage) / 100;
module.exports = { getRefundPolicy, calculateRefundAmount };