const User = require('../models/User');
const jwt = require('jsonwebtoken');
const stripe = require('../config/stripe');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const STATUS = require('../constants/statusCodes.js');
const MSG = require('../constants/errorMessages.js');

// Helper to set cookies
const setCookies = (res, accessToken, refreshToken) => {
    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(STATUS.BAD_REQUEST).json({ message: MSG.REQUIRED_FIELDS });
        }
        
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(STATUS.BAD_REQUEST).json({ message: MSG.USER_EXISTS });
        }

        const customer = await stripe.customers.create({
            email,
            name,
        });

        const user = await User.create({
            name,
            email,
            password,
            stripeCustomerId: customer.id
        });

        if (user) {
            const accessToken = generateAccessToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            // store refresh token in array
            user.refreshTokens.push({ token: refreshToken });
            await user.save();

            setCookies(res, accessToken, refreshToken);
            res.status(STATUS.CREATED).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                accessToken,
                stripeCustomerId: user.stripeCustomerId
            });
        } else {
            console.log("User Not Created");
            res.status(STATUS.BAD_REQUEST).json({ message: MSG.INVALID_CREDENTIALS });
        }
    } catch (error) {
        console.log("Error Occurred While Registration:", error);
        res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(STATUS.BAD_REQUEST).json({ message: MSG.REQUIRED_FIELDS });
        }

        const user = await User.findOne({ email }).select('+password');
        // console.log("user is :", user);
        
        if (user && (await user.matchPassword(password))) {
            const accessToken = generateAccessToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            user.refreshTokens.push({ token: refreshToken });
            await user.save();

            setCookies(res, accessToken, refreshToken);

            res.status(STATUS.SUCCESS).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                accessToken
            });
        } else {
            res.status(STATUS.UNAUTHORIZED).json({ message: MSG.INVALID_CREDENTIALS });
        }
    } catch (error) {
        res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
    }
};



const logoutUser = async (req, res) => {
    try {
        const refreshToken = req.cookies.jwt;

        if (refreshToken) {
            const user = await User.findOne({ refreshToken });
            if (user) {
                user.refreshToken = null; // Only That Session.
                await user.save();
            }
        }

        res.cookie('jwt', '', {
            httpOnly: true,
            expires: new Date(0),
        });

        res.status(STATUS.SUCCESS).json({ message: MSG.LOGOUT_SUCCESS });
    } catch (error) {
        console.log("Error in Logout:", error);
        res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
    }
};

const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(STATUS.UNAUTHORIZED).json({ message: MSG.INVALID_CREDENTIALS });
        }

        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.id);

        const tokenExists = user.refreshTokens.find(rt => rt.token === token);

        if (!user || !tokenExists) {
            // logout all sessions
            user.refreshTokens = [];
            await user.save();

            return res.status(STATUS.UNAUTHORIZED).json({ message: MSG.INVALID_CREDENTIALS });
        }

        const newAccessToken = generateAccessToken(user._id);

        res.status(STATUS.SUCCESS).json({ accessToken: newAccessToken });

    } catch (error) {
        res.status(STATUS.UNAUTHORIZED).json({ message: MSG.INVALID_CREDENTIALS });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.status(STATUS.SUCCESS).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                stripeCustomerId: user.stripeCustomerId
            });
        } else {
            res.status(STATUS.NOT_FOUND).json({ message: MSG.USER_NOT_FOUND });
        }
    } catch (error) {
        console.log("Error in Get User Profile:", error);
        res.status(STATUS.SERVER_ERROR).json({ message: MSG.SERVER_ERROR });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    getUserProfile
};