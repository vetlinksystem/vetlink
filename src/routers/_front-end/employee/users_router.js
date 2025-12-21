const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const employeeUsersRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

employeeUsersRouter.use(express.static(publicPath));

// ===== Controllers Import =====
const getAllUsers = require('../../../controllers/employee/registered_users/get_all_users');

// ===== Users Page =====
employeeUsersRouter.get('/users', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/registered_users.html'));
});

// ===== Users APIs =====
employeeUsersRouter.get('/users/get-all', authenticateApi, ensureTypeApi('employee'), getAllUsers);

module.exports = employeeUsersRouter;