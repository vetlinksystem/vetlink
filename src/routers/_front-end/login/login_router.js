const express = require('express');
const path = require('path');
const { signAccess, ensureGuestPage, resolveHome } = require('../../../middlewares/auth');

const loginRouters = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

loginRouters.use(express.static(publicPath));

loginRouters.get('/', ensureGuestPage, async (req, res) => {
    res.sendFile(path.join(publicPath, `login/html/index.html`));
});

loginRouters.get('/unauthorized', (req, res) => {
    res.status(403).send('Nuh uh');
});

loginRouters.post('/login', async (req, res) => {
    const { username, password, user_type } = req.body;
    let user = null;

    // this is dummy
    if (username === 'admin' && password === 'admin' && user_type == 'employee') {
        user = { id: 1, type: 'employee', name: 'Admin' };
    } else if (username === 'ken' && password === 'ken' && user_type == 'client') {
        user = { id: 2, type: 'client', name: 'Ken' };
    }
    
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signAccess(user);

    res.cookie('token', token), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000
    }

    res.json({
        message: 'Login successful',
        token,
        redirect: resolveHome(user)
    });
});

loginRouters.post('/logout', (req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    res.redirect('/');
});

module.exports = loginRouters;