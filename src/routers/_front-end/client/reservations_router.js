const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const reservationRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

reservationRouter.use(express.static(publicPath));

reservationRouter.get('/reservations', ensureAuthPage, ensureTypePage('client'), (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/reservations.html'));
});

module.exports = reservationRouter;