const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        return res.status(400).json({
            message: "Validation error",
            errors: error.details.map(err => err.message)
        });
    }

    req.body = value;
    next();
};

module.exports = validate;