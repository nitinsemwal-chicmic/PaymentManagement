const stripe = require('../config/stripe');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/invoice');
const User = require('../models/User');
const STATUS = require('../constants/statusCodes');
const MSG = require('../constants/errorMessages');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const findUser = async (customerId, email) => {
    let user = await User.findOne({ stripeCustomerId: customerId });
    if (!user && email) {
        user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            user.stripeCustomerId = customerId;
            await user.save();
            console.log(`Synced stripeCustomerId for user: ${email}`);
        }
    }
    return user;
};

/**
 * Saves or updates an Invoice document in MongoDB.
 * @param {string} invoiceId   - The value used as stripeInvoiceId (Stripe invoice ID or charge ID for one-time)
 * @param {object} fields      - Fields to upsert
 */
const saveInvoice = async (invoiceId, fields) => {
    return Invoice.findOneAndUpdate(
        { stripeInvoiceId: invoiceId },
        fields,
        { upsert: true, new: true }
    );
};

/**
 * Saves or updates a Transaction document in MongoDB.
 * @param {string} paymentIntentId
 * @param {object} fields
 */
const saveTransaction = async (paymentIntentId, fields) => {
    return Transaction.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId },
        fields,
        { upsert: true, new: true }
    );
};

// ─── Main Webhook Handler ─────────────────────────────────────────────────────

const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log('Webhook signature verified');
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(STATUS.BAD_REQUEST).send(MSG.WEBHOOK_SIGNATURE_FAILED);
    }

    const obj = event.data.object;
    console.log(`Received webhook event: ${event.type}`);

    try {
        switch (event.type) {

            // ── Payment Intent ────────────────────────────────────────────────
            case 'payment_intent.succeeded':
            case 'payment_intent.payment_failed': {
                const user = await findUser(obj.customer, obj.receipt_email);
                if (!user) {
                    console.warn(`No user found for payment_intent ${obj.id}`);
                    break;
                }

                await saveTransaction(obj.id, {
                    userId: user._id,
                    amount: obj.amount / 100,
                    currency: obj.currency,
                    status: event.type === 'payment_intent.succeeded' ? 'succeeded' : 'failed',
                    type: obj.invoice ? 'subscription' : 'one-time',
                });

                console.log(`Transaction saved for payment_intent ${obj.id} → user ${user._id}`);
                break;
            }

            // ── Subscription lifecycle ────────────────────────────────────────
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                let subUser = await User.findOne({ stripeCustomerId: obj.customer });

                if (!subUser) {
                    try {
                        const customer = await stripe.customers.retrieve(obj.customer);
                        if (customer?.email) {
                            subUser = await findUser(obj.customer, customer.email);
                        }
                    } catch (err) {
                        console.error('Error retrieving Stripe customer:', err.message);
                    }
                }

                if (!subUser) {
                    console.warn(`No user found for subscription ${obj.id} (customer: ${obj.customer})`);
                    break;
                }

                await Subscription.findOneAndUpdate(
                    { stripeSubscriptionId: obj.id },
                    {
                        userId: subUser._id,
                        status: event.type === 'customer.subscription.deleted' ? 'canceled' : obj.status,
                        currentPeriodEnd: obj.current_period_end
                            ? new Date(obj.current_period_end * 1000)
                            : null,
                    },
                    { upsert: true, new: true }
                );

                console.log(`Subscription ${obj.id} saved for user ${subUser._id}`);
                break;
            }

            // ── Invoice events ────────────────────────────────────────────────
            //
            // Flow for subscription payments:
            //   invoice.created → invoice.finalized → invoice.payment_succeeded → invoice.paid
            //
            // We handle all four so the invoice record is created early and
            // updated as its status progresses. The transaction is only written
            // once a payment_intent exists (i.e. on payment_succeeded / paid).
            case 'invoice.created':
            case 'invoice.finalized':
            case 'invoice.payment_succeeded':
            case 'invoice.paid': {
                const user = await findUser(obj.customer, obj.customer_email);
                if (!user) {
                    console.warn(`No user found for invoice ${obj.id} (customer: ${obj.customer})`);
                    break;
                }

                // 1. Save / update invoice record
                await saveInvoice(obj.id, {
                    userId: user._id,
                    stripeCustomerId: obj.customer,
                    subscriptionId: obj.subscription || null,
                    amountPaid: obj.amount_paid ? obj.amount_paid / 100 : 0,
                    currency: obj.currency,
                    status: obj.status,
                    invoicePdf: obj.invoice_pdf || null,
                    hostedInvoiceUrl: obj.hosted_invoice_url || null,
                    billingReason: obj.billing_reason || null,
                });

                // 2. Save transaction only when payment has actually succeeded
                const paymentIntentId =
                    typeof obj.payment_intent === 'string'
                        ? obj.payment_intent
                        : obj.payment_intent?.id;

                if (
                    paymentIntentId &&
                    (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid')
                ) {
                    await saveTransaction(paymentIntentId, {
                        userId: user._id,
                        amount: obj.amount_paid / 100,
                        currency: obj.currency,
                        status: 'succeeded',
                        type: 'subscription',
                    });

                    console.log(`Transaction saved for invoice ${obj.id} (pi: ${paymentIntentId})`);
                }

                console.log(`Invoice ${obj.id} [${event.type}] saved for user ${user._id}`);
                break;
            }

            // ── Charge (one-time payments only) ──────────────────────────────
            //
            // Only creates an invoice record when the charge has NO linked
            // Stripe invoice — subscription charges are already covered above.
            case 'charge.succeeded': {
                // Skip — the invoice event handler covers subscription charges.
                // This block only handles standalone (one-time) charges.
                if (obj.invoice) {
                    console.log(`Charge ${obj.id} is linked to invoice ${obj.invoice}; skipping duplicate invoice creation`);
                    break;
                }

                const chargeEmail =
                    obj.customer_email || obj.billing_details?.email || null;
                const chargeUser = await findUser(obj.customer, chargeEmail);

                if (!chargeUser) {
                    console.warn(`No user found for one-time charge ${obj.id}`);
                    break;
                }

                // 1. Save pseudo-invoice (using charge ID as the invoice identifier)
                await saveInvoice(obj.id, {
                    userId: chargeUser._id,
                    stripeCustomerId: obj.customer,
                    subscriptionId: null,
                    amountPaid: obj.amount ? obj.amount / 100 : 0,
                    currency: obj.currency,
                    status: 'paid',
                    invoicePdf: obj.receipt_url || null,
                    hostedInvoiceUrl: obj.receipt_url || null,
                    billingReason: 'one_time_payment',
                });

                // 2. Save transaction
                const piId =
                    typeof obj.payment_intent === 'string'
                        ? obj.payment_intent
                        : obj.payment_intent?.id;

                if (piId) {
                    await saveTransaction(piId, {
                        userId: chargeUser._id,
                        amount: obj.amount / 100,
                        currency: obj.currency,
                        status: 'succeeded',
                        type: 'one-time',
                    });
                }

                console.log(`One-time charge ${obj.id} and transaction saved for user ${chargeUser._id}`);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error(`Error processing webhook event ${event.type}:`, error);
        return res.status(STATUS.SERVER_ERROR).json({ message: MSG.WEBHOOK_PROCESSING_FAILED });
    }

    res.status(STATUS.SUCCESS).json({ message: MSG.WEBHOOK_RECEIVED });
};

module.exports = { handleStripeWebhook };