const mongoose = require('mongoose');
const { hashPassword, matchPassword } = require('../utils/passwordUtils');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false 
    },
    stripeCustomerId: {
        type: String,
        default: null
    },
    refreshTokens: [
    {
        token: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }
]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', hashPassword);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = matchPassword;

module.exports = mongoose.model('User', userSchema);