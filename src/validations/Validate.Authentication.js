const Joi = require('joi');

const RegisterSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().max(254).required(),
    password: Joi.string()
        .min(8)
        .max(64)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .required()
});

const LoginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

module.exports = {
    RegisterSchema,
    LoginSchema
};