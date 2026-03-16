const Transaction = require('../models/Transaction');
const stripe = require('../config/stripe');

const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'usd' } = req.body;
        const user = req.user;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }
        console.log(user);
        if (!user.id) { // it's not user.stripeCustomerId
            return res.status(400).json({ message: 'User does not have a Stripe Customer ID' });
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            customer: user.stripeCustomerId,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Create a pending transaction record
        const transaction = await Transaction.create({
            userId: user._id,
            stripePaymentIntentId: paymentIntent.id,
            amount,
            currency,
            status: 'pending',
            type: 'one-time'
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            transactionId: transaction._id
        });
    } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({ message: error.message });
    }
};

const getPaymentHistory = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPaymentIntent,
    getPaymentHistory
};
