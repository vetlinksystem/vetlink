const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');
const { requirePermission } = require('../../../middlewares/require_permission');

const employeeUsersRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

employeeUsersRouter.use(express.static(publicPath));

// ===== Controllers Import =====
const getAllUsers = require('../../../controllers/employee/registered_users/get_all_users');
const getUserDetails = require('../../../controllers/employee/registered_users/get_user_details');
const updateUser = require('../../../controllers/employee/registered_users/update_user');
const deleteUser = require('../../../controllers/employee/registered_users/delete_user');

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
// Roles: admin/staff/vet may view; only staff may edit; only admin may delete.
employeeUsersRouter.get('/users/get-all', authenticateApi, ensureTypeApi('employee'), requirePermission('customers.view'), getAllUsers);

// User details API: /employee/users/get?id=...
employeeUsersRouter.get('/users/get', authenticateApi, ensureTypeApi('employee'), requirePermission('customers.view'), getUserDetails);

// Update / Delete registered users (clients)
employeeUsersRouter.put('/users/update', authenticateApi, ensureTypeApi('employee'), requirePermission('customers.edit'), updateUser);
employeeUsersRouter.delete('/users/delete', authenticateApi, ensureTypeApi('employee'), requirePermission('customers.delete'), deleteUser);

module.exports = employeeUsersRouter;