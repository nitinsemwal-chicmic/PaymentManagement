const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

// Helper to set cookies
const setCookies = (res, accessToken, refreshToken) => {
    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
        sameSite: 'strict', // Prevent CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const stripe = require('../config/stripe');
        console.log("Customer Not Yet Created");
        // Create Stripe Customer
        const customer = await stripe.customers.create({
            email,
            name,
        });
        console.log("Customer Created");

        const user = await User.create({
            name,
            email,
            password,
            stripeCustomerId: customer.id
        });

        console.log("User Created");
        if (user) {
            const accessToken = generateAccessToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            // Save refresh token in DB
            user.refreshToken = refreshToken;
            await user.save()
            setCookies(res, accessToken, refreshToken);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                accessToken,
                stripeCustomerId: user.stripeCustomerId
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.log("Error Occured While Registration :", error);
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            const accessToken = generateAccessToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            // Save refresh token in DB
            user.refreshToken = refreshToken;
            await user.save();
            setCookies(res, accessToken, refreshToken);
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                stripeCustomerId: user.stripeCustomerId,
                accessToken,
            });
        } else {
            console.log("Invalid email or password");
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.log("Error in Login :", error);
        res.status(500).json({ message: error.message });
    }
};

const logoutUser = async (req, res) => {
    try {
        const refreshToken = req.cookies.jwt;
        if (refreshToken) {
            const user = await User.findOne({ refreshToken });
            if (user) {
                user.refreshToken = null;
                await user.save();
            }
        }
        res.cookie('jwt', '', {
            httpOnly: true,
            expires: new Date(0),
        });
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.log("Error in Logout :", error);
        res.status(500).json({ message: error.message });
    }
};


const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no refresh token' });
        }

        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== token) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }

        const accessToken = generateAccessToken(user._id);
        res.json({ accessToken });
    } catch (error) {
        console.log("Error in Refresh Token :", error);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                stripeCustomerId: user.stripeCustomerId
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.log("Error in Get User Profile :", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    getUserProfile
};
