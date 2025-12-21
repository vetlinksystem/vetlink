const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const profileRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

profileRouter.use(express.static(publicPath));

profileRouter.get('/profile', ensureAuthPage, ensureTypePage('client'), (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/profile.html'));
});

module.exports = profileRouter;