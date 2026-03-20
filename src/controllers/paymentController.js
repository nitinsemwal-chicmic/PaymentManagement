const Transaction = require('../models/Transaction');
const User = require('../models/User');
const stripe = require('../config/stripe');
const STATUS = require('../constants/statusCodes');
const MSG = require('../constants/errorMessages');

const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'usd' } = req.body;
        let user = req.user;

        if (!amount || amount <= 0) {
            return res.status(STATUS.BAD_REQUEST).json({ message: MSG.INVALID_AMOUNT });
        }

        if (!user.stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
            });

            await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
            user.stripeCustomerId = customer.id;
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency, // Anything Passed
            customer: user.stripeCustomerId,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        const transaction = await Transaction.create({
            userId: user._id,
            stripePaymentIntentId: paymentIntent.id,
            amount,
            currency,
            status: 'pending',
            type: 'one-time'
        });

        res.status(STATUS.SUCCESS).json({
            clientSecret: paymentIntent.client_secret,
            transactionId: transaction._id
        });

    } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(STATUS.SERVER_ERROR).json({
            message: MSG.PAYMENT_INTENT_FAILED
        });
    }
};

const getPaymentHistory = async (req, res) => {
    try {
        const transactions = await Transaction
            .find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.status(STATUS.SUCCESS).json(transactions);

    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(STATUS.SERVER_ERROR).json({
            message: MSG.FETCH_TRANSACTIONS_FAILED
        });
    }
};

module.exports = {
    createPaymentIntent,
    getPaymentHistory
};