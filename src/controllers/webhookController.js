const stripe = require('../config/stripe');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');

const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log("Webhook Signature Verified Successfully");
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Extract the object from the event
    const dataObject = event.data.object;
    console.log("DataObject from Webhook:",dataObject);
    console.log(`Received Webhook Event: ${event.type}`);

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                // Update transaction status to succeeded
                await Transaction.findOneAndUpdate(
                    { stripePaymentIntentId: dataObject.id },
                    { status: 'succeeded' },
                    { new: true }
                );
                console.log(`Transaction Succeeded: ${dataObject.id}`);
                break;

            case 'payment_intent.payment_failed':
                // Update transaction status to failed
                await Transaction.findOneAndUpdate(
                    { stripePaymentIntentId: dataObject.id },
                    { status: 'failed' },
                    { new: true }
                );
                console.log(`Transaction Failed: ${dataObject.id}`);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                // Update subscription in database
                await Subscription.findOneAndUpdate(
                    { stripeSubscriptionId: dataObject.id },
                    { 
                        status: dataObject.status,
                        currentPeriodEnd: new Date(dataObject.current_period_end * 1000)
                    },
                    { upsert: true, new: true }
                );
                console.log(`Subscription Updated/Created: ${dataObject.id}`);
                break;

            case 'customer.subscription.deleted':
                // Update subscription status to canceled
                await Subscription.findOneAndUpdate(
                    { stripeSubscriptionId: dataObject.id },
                    { 
                        status: 'canceled',
                        currentPeriodEnd: new Date(dataObject.current_period_end * 1000)
                    },
                    { new: true }
                );
                console.log(`Subscription Deleted: ${dataObject.id}`);
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error(`Error processing webhook event ${event.type}:`, error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }

    res.json({ received: true });
};

module.exports = {
    handleStripeWebhook
};
