const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const protect = async(req,res,next) =>{
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        try{
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token,process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id);
            next();
        } catch(error){
            console.log(error);
            res.status(401).json({message : 'Not Authorized , Token Failed'});
        }
    }
    if(!token){
        res.status(401).json({message: 'Not Authorized , No Token Found'});
    }
};

module.exports = {protect};