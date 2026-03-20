const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

// Limiter for authentication
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Too many Authentication attempts, please try again after 15 minutes'
    }
});

// Limiter for payment and subscription creation
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Too many payment requests, please try again after 15 minutes'
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    paymentLimiter
};
