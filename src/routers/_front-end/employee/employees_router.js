const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const manageEmployeesRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

manageEmployeesRouter.use(express.static(publicPath));

// Manage Employees is an administrator-only page (roles note: "Manage Employee
// (add/delete/edit)" appears under Admin only).
const { resolveRole, can } = require('../../../utilities/roles');
const firestoreManager = require('../../../fb/firestore_manager');

const ensureCanManageEmployees = async (req, res, next) => {
    try {
        const emp = await firestoreManager.getData('employees', String(req.user?.id || ''));
        if (!emp || !can(resolveRole(emp), 'employees.manage')) {
            return res.redirect('/employee/dashboard');
        }
        next();
    } catch (err) {
        console.error('ensureCanManageEmployees error', err);
        return res.redirect('/employee/dashboard');
    }
};

manageEmployeesRouter.get('/employees', ensureAuthPage, ensureTypePage('employee'), ensureCanManageEmployees, (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/manage_employees.html'));
});

module.exports = manageEmployeesRouter;