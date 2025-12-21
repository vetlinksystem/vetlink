const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const reservationRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

reservationRouter.use(express.static(publicPath));

// Backward-compatible redirect
reservationRouter.get('/reservation', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    return res.redirect('/employee/appointments');
});

// Employee Appointments page (reuses the former reservation UI)
reservationRouter.get('/appointments', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/reservation.html'));
});

module.exports = reservationRouter;