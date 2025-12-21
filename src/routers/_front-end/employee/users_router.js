const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const employeeUsersRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

employeeUsersRouter.use(express.static(publicPath));

// ===== Controllers Import =====
const getAllUsers = require('../../../controllers/employee/registered_users/get_all_users');
const getUserDetails = require('../../../controllers/employee/registered_users/get_user_details');

// ===== Users Page =====
employeeUsersRouter.get('/users', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/registered_users.html'));
});

// ===== User Details Page =====
// Used by links like /employee/user?id=...
employeeUsersRouter.get('/user', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'user/html/user.html'));
});

// ===== Users APIs =====
employeeUsersRouter.get('/users/get-all', authenticateApi, ensureTypeApi('employee'), getAllUsers);

// User details API: /employee/users/get?id=...
employeeUsersRouter.get('/users/get', authenticateApi, ensureTypeApi('employee'), getUserDetails);

module.exports = employeeUsersRouter;