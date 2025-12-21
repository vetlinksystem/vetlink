const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const manageEmployeesRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

manageEmployeesRouter.use(express.static(publicPath));

manageEmployeesRouter.get('/employees', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/manage_employees.html'));
});

module.exports = manageEmployeesRouter;