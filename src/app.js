const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db.js');
const {errorHandler,notfound} = require('./middlewares/errorMiddleware.js');
const authRoutes = require('./routes/authRoutes.js');

dotenv.config();
connectDB();

const app = express();
app.use(cors());

// Stripe Webhook Endpoint (MUST be before express.json() for raw body access)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const stripe = require('./config/stripe');
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful!');
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

app.use(express.json());

app.use('/auth', authRoutes);

app.get('/',(req,res)=>{
    res.send('Stripe Payment Backend API is Running');
});

app.use(notfound);
app.use(errorHandler);

module.exports = app;