const { signAccess, ensureGuestPage, resolveHome } = require('../../../middlewares/auth');
const path = require('path');
const express = require('express');
const firestoreManager = require('../../../fb/firestore_manager');
const { generateClientId } = require('../../../utilities/idGenerator');

const passwordMeetsRules = (pw) => {
  const s = String(pw || '');
  return (
    s.length >= 11 &&
    /[A-Z]/.test(s) &&
    /[a-z]/.test(s) &&
    /[0-9]/.test(s) &&
    /[^A-Za-z0-9]/.test(s)
  );
};

const loginRouters = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

loginRouters.use(express.static(publicPath));

/* PAGE */
loginRouters.get('/', ensureGuestPage, (req, res) => {
  return res.sendFile(path.join(publicPath, 'login/html/index.html'));
});

/* LOGIN (FIXED: now checks Firestore) */
loginRouters.post('/login', async (req, res) => {
  try {
    const { username, password, user_type } = req.body || {};

    if (!username || !password || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing username, password, or user type.'
      });
    }

    // Decide collection & allowed login fields
    const type = String(user_type).toLowerCase();
    let collection = null;

    if (type === 'client') collection = 'clients';
    else if (type === 'employee') collection = 'employees';
    else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type.'
      });
    }

    // Find user by email or username (tries email first then username)
    // If your documents only have email, you can remove the username lookup.
    const byEmail = await firestoreManager.getAllData(collection, { email: username });
    let userDoc = Array.isArray(byEmail) && byEmail.length ? byEmail[0] : null;

    if (!userDoc) {
      const byUsername = await firestoreManager.getAllData(collection, { username });
      userDoc = Array.isArray(byUsername) && byUsername.length ? byUsername[0] : null;
    }

    if (!userDoc) {
      return res.status(401).json({
        success: false,
        message: 'Account not found.'
      });
    }

    // Password check (plain-text match, since that’s how most of your current code is)
    // If you later hash passwords, we’ll replace this with bcrypt compare.
    if (String(userDoc.password || '') !== String(password)) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password.'
      });
    }

    // Build token payload (keep small)
    const tokenUser = {
      id: userDoc.id,
      type,
      name: userDoc.name || userDoc.fullName || userDoc.email || 'User'
    };

    const token = signAccess(tokenUser);

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      redirect: resolveHome(tokenUser)
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      error: err.message
    });
  }
});

/* REGISTER CLIENT (NEW) */
loginRouters.post('/register/client', async (req, res) => {
  try {
    const { name, email, password, number, address } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (!passwordMeetsRules(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least: 11 characters, one uppercase, one lowercase, one number, and one special character.'
      });
    }

    // Check existing email
    const existing = await firestoreManager.getAllData('clients', { email });
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.'
      });
    }

    // Sequential, human-friendly IDs (c1001, c1002, ...)
    const clientId = await generateClientId();

    const clientDoc = {
      id: clientId,
      type: 'client',
      name,
      email,
      password,
      number: number || '',
      address: address || '',
      createdAt: new Date().toISOString()
    };

    const ok = await firestoreManager.addData('clients', clientDoc);
    if (!ok) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create account.'
      });
    }

    // Auto-login after register
    const tokenUser = { id: clientId, type: 'client', name };
    const token = signAccess(tokenUser);

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24
    });

    return res.json({
      success: true,
      message: 'Registration successful.',
      redirect: resolveHome(tokenUser)
    });
  } catch (err) {
    console.error('REGISTER CLIENT ERROR:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: err.message
    });
  }
});

/* LOGOUT (KEEP YOUR EXISTING) */
loginRouters.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.redirect('/');
});

module.exports = loginRouters;
