const jwt = require('jsonwebtoken');
require('dotenv').config();

const signAccess = (user) => {
    const payload = {
        id: user.id,
        type: user.type,
        name: user.name
    };
    return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '1h' });
}

const verify = (token) => {
    try {
        return jwt.verify(token, process.env.SECRET_KEY);
    } catch {
        return null;
    }
}

// PAGE GUARDS
const ensureAuthPage = (req, res, next) => {
    const token = req.cookies?.token;
    const user = token && verifyToken(token);

    if (!user) return res.redirect('/');

    req.user = user;
    next();
}

const ensureGuestPage = (req, res, next) => {
    const token = req.cookies?.token;
    const user = token && verifyToken(token);

    if (!user) return next();
    
    return res.redirect(resolveHome(user));
}

const ensureTypePage = (requiredType) => {
    return (req, res, next) => {
        const u = req.user;
        if (!u) return res.redirect('/');
        if (u.type !== requiredType) return res.redirect('/unauthorized');
        next();
    };
}

const resolveHome = (user) => {
    if (user.type === 'employee') return '/employee/dashboard';
    return '/client/dashboard';
}

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.SECRET_KEY);
    } catch {
        return null;
    }
}

const getTokenFromRequest = (req) => {
    const h = req.headers.authorization;
    if (h && h.startsWith('Bearer ')) return h.slice(7);
    return req.cookies?.token || null;
}

const authenticateApi = (req, res, next) => {
    const h = req.headers.authorization;
    const token = h && h.startsWith('Bearer ') ? h.slice(7) : req.cookies?.token;
    const user = token && verifyToken(token);
    
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    req.user = user;
    next();
}

const ensureTypeApi = (requiredType) => {
    return (req, res, next) => {
        const u = req.user;
        if (!u) return res.status(401).json({ error: 'Unauthenticated' });
        if (u.type !== requiredType) return res.status(403).json({ error: 'Forbidden' });
        next();
    };
}

module.exports = {
  signAccess,
  ensureAuthPage,
  ensureGuestPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi,
  resolveHome
};