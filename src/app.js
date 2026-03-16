const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.js');
const {errorHandler,notfound} = require('./middlewares/errorMiddleware.js');
const authRoutes = require('./routes/authRoutes.js');
const paymentRoutes = require('./routes/paymentRoutes.js');
const webhookRoutes = require('./routes/webhookRoutes.js');

connectDB();

const app = express();
app.use(cors());

app.get('/',(req,res)=>{
    res.send('Stripe Payment Backend API is Running');
});

// Mount routes
app.use('/webhooks', webhookRoutes);
app.use(express.json()); // Apply express.json() after webhooks to avoid parsing raw body
app.use('/auth', authRoutes);
app.use('/payments', paymentRoutes);

app.use(notfound);
app.use(errorHandler);

module.exports = app;