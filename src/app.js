const dotenv = require('dotenv');
dotenv.config({ quiet: true });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.js');
const { errorHandler, notfound } = require('./middlewares/errorMiddleware.js');
const authRoutes = require('./routes/authRoutes.js');
const paymentRoutes = require('./routes/paymentRoutes.js');
const subscriptionRoutes = require('./routes/subscriptionRoutes.js');
const webhookRoutes = require('./routes/webhookRoutes.js');
const invoiceRoutes = require('./routes/invoiceRoutes.js');
const cookieParser = require('cookie-parser');
const csrfProtection = require('./middlewares/csrfMiddleware.js');
const { apiLimiter } = require('./middlewares/rateLimitMiddleware.js');

connectDB();

const app = express();
app.use(apiLimiter);
app.use(cors());
app.use(cookieParser());

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

app.get('/', (req, res) => {
    res.send('Stripe Payment Backend API is Running');
});

// Mount routes
app.use('/webhooks', webhookRoutes);
app.use(express.json()); // Apply express.json() after webhooks to avoid parsing raw body
app.use('/auth', authRoutes);
app.use('/payments', paymentRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/invoices', invoiceRoutes)

app.use(notfound);
app.use(errorHandler);

module.exports = app;