const Subscription = require('../models/Subscription');
const User = require('../models/User');
const stripe = require('../config/stripe');
const STATUS = require('../constants/statusCodes');
const MSG = require('../constants/errorMessages');

const createSubscription = async (req, res) => {
    try {
        const { priceId, planName } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(STATUS.NOT_FOUND).json({ message: MSG.USER_NOT_FOUND });
        }

        if (!priceId || !planName) {
            return res.status(STATUS.BAD_REQUEST).json({
                message: MSG.SUBSCRIPTION_REQUIRED_FIELDS
            });
        }

        // Create Stripe Customer if not exists
        if (!user.stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
            });

            await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
            user.stripeCustomerId = customer.id;
        }

        // Subscription Creations,
        const subscription = await stripe.subscriptions.create({
            customer: user.stripeCustomerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
        });

        const currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null;

        const newSubscription = await Subscription.create({
            userId: user._id,
            stripeSubscriptionId: subscription.id,
            planName,
            status: subscription.status,
            currentPeriodEnd
        });

        const clientSecret =
            subscription.latest_invoice?.payment_intent?.client_secret || null;

        res.status(STATUS.CREATED).json({
            subscriptionId: subscription.id,
            clientSecret,
            dbSubscription: newSubscription
        });

    } catch (error) {
        console.log("Error Occurred While Subscription Creation:", error);
        res.status(STATUS.SERVER_ERROR).json({
            message: MSG.SUBSCRIPTION_CREATION_FAILED
        });
    }
};

const cancelSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.body;

        const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);

        // Subscription End Date
        const currentPeriodEnd = deletedSubscription.current_period_end
            ? new Date(deletedSubscription.current_period_end * 1000)
            : null;
        const subscription = await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            {
                status: 'canceled',
                currentPeriodEnd
            },
            { new: true }
        );

        if (!subscription) {
            return res.status(STATUS.NOT_FOUND).json({
                message: MSG.SUBSCRIPTION_NOT_FOUND
            });
        }

        res.status(STATUS.SUCCESS).json({
            message: MSG.SUBSCRIPTION_CANCEL_SUCCESS,
            subscription
        });

    } catch (error) {
        console.error('Error while canceling subscription:', error);
        res.status(STATUS.SERVER_ERROR).json({
            message: MSG.SUBSCRIPTION_CANCEL_FAILED
        });
    }
};

const mySubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            userId: req.user._id,
            status: 'active'
        }).sort({ createdAt: -1 });

        if (!subscription) {
            return res.status(STATUS.NOT_FOUND).json({
                message: MSG.NO_ACTIVE_SUBSCRIPTION
            });
        }

        res.status(STATUS.SUCCESS).json(subscription);

    } catch (error) {
        console.error('Error while fetching subscription:', error);
        res.status(STATUS.SERVER_ERROR).json({
            message: MSG.SERVER_ERROR
        });
    }
};

module.exports = {
    createSubscription,
    cancelSubscription,
    mySubscription
};