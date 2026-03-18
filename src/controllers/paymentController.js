const Transaction = require('../models/Transaction');
const User = require('../models/User');
const stripe = require('../config/stripe');

const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'usd' } = req.body;
        let user = req.user;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }
        console.log(user);
        
        if (!user.stripeCustomerId) {
            console.log(`Creating Stripe customer for user: ${user.email}`);
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
            });
            
            // Update new Stripe Customer ID
            await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
            user.stripeCustomerId = customer.id;
            console.log(`Stripe customer created: ${customer.id}`);
        }

        console.log("Processing payment for user:", user.email, "Stripe ID:", user.stripeCustomerId);

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
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
