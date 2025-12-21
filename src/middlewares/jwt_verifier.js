const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;

const verifyToken = (requiredRole) => {
    return (req, res, next) => {
        const token = req.cookies.token;
    
        if (!token) return res.redirect('/login');
    
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                res.clearCookie('token');
                return res.redirect('/login');
            }
            if (requiredRole) {
                if (decoded.role != requiredRole) {
                    return res.redirect('/unauthorized');
                }
            } 
            req.user = decoded;
            next();
        });
    }
};

const noToken = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                res.clearCookie('token');
                return res.redirect('/login');
            }

            req.user = decoded;
            return res.redirect('/???'); // don't know what to do here if this approach is correct
        });
    } else {
        next();
    }
}

module.exports = {
    verifyToken,
    noToken
};