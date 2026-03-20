const jwt = require('jsonwebtoken');

const generateAccessToken = (id) =>{
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
};

const generateRefreshToken = (id) =>{
    return jwt.sign({id}, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: '7d'
    })
}

module.exports = {generateAccessToken,generateRefreshToken};
