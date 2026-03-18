const Subscription = require('../models/Subscription');
const User = require('../models/User');
const stripe = require('../config/stripe');


const createSubscription = async (req, res) => {
    try {
        const { priceId, planName } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!priceId || !planName) {
            return res.status(400).json({ message: 'Price ID and Plan Name are required' });
        }

        // Create the subscription in Stripe
        const subscription = await stripe.subscriptions.create({
            customer: user.stripeCustomerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
        });

        // Store the subscription in our database
        const newSubscription = await Subscription.create({
            userId: user._id,
            stripeSubscriptionId: subscription.id,
            planName: planName,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });

        res.status(201).json({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            dbSubscription: newSubscription
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ message: error.message });
    }
};


const cancelSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        
        // Cancel in Stripe
        const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);

        // Update in our database
        const subscription = await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            { 
                status: deletedSubscription.status,
                currentPeriodEnd: new Date(deletedSubscription.current_period_end * 1000)
            },
            { new: true }
        );

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found in database' });
        }

        res.json({ message: 'Subscription canceled successfully', subscription });
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ message: error.message });
    }
};


const getMe = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ 
            userId: req.user._id,
            status: 'active' 
        }).sort({ createdAt: -1 });

        if (!subscription) {
            return res.status(404).json({ message: 'No active subscription found' });
        }

        res.json(subscription);
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createSubscription,
    cancelSubscription,
    getMe
};
