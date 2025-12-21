const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const scheduleRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

scheduleRouter.use(express.static(publicPath));

scheduleRouter.get('/schedule', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/schedule.html'));
});

module.exports = scheduleRouter;