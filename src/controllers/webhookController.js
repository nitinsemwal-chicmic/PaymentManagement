const stripe = require('../config/stripe');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const STATUS = require('../constants/statusCodes');
const MSG = require('../constants/errorMessages');

const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    // ✅ Verify signature
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log("Webhook Signature Verified Successfully");
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(STATUS.BAD_REQUEST).send(MSG.WEBHOOK_SIGNATURE_FAILED);
    }

    const dataObject = event.data.object;
    console.log("DataObject from Webhook:", dataObject);
    console.log(`Received Webhook Event: ${event.type}`);

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await Transaction.findOneAndUpdate(
                    { stripePaymentIntentId: dataObject.id },
                    { status: 'succeeded' },
                    { new: true }
                );
                break;

            case 'payment_intent.payment_failed':
                await Transaction.findOneAndUpdate(
                    { stripePaymentIntentId: dataObject.id },
                    { status: 'failed' },
                    { new: true }
                );
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await Subscription.findOneAndUpdate(
                    { stripeSubscriptionId: dataObject.id },
                    {
                        status: dataObject.status,
                        currentPeriodEnd: new Date(dataObject.current_period_end * 1000)
                    },
                    { upsert: true, new: true }
                );
                break;

            case 'customer.subscription.deleted':
                await Subscription.findOneAndUpdate(
                    { stripeSubscriptionId: dataObject.id },
                    {
                        status: 'canceled',
                        currentPeriodEnd: new Date(dataObject.current_period_end * 1000)
                    },
                    { new: true }
                );
                break;

            default:
                console.log(`Unhandled Event: ${event.type}`);
        }
    } catch (error) {
        console.error(`Error processing webhook event ${event.type}:`, error);
        return res.status(STATUS.SERVER_ERROR).json({
            message: MSG.WEBHOOK_PROCESSING_FAILED
        });
    }

    res.status(STATUS.SUCCESS).json({
        message: MSG.WEBHOOK_RECEIVED
    });
};

module.exports = {
    handleStripeWebhook
};