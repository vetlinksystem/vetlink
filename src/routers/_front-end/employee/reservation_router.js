const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const reservationRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

reservationRouter.use(express.static(publicPath));

reservationRouter.get('/reservation', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/reservation.html'));
});

module.exports = reservationRouter;