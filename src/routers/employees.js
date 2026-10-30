const express = require('express');
const employeeRouters = express.Router();

const addEmployeeController = require('../controllers/employees/add');
const getEmployeeController = require('../controllers/employees/get');
const getAllEmployeeController = require('../controllers/employees/get_all');
const updateEmployeeController = require('../controllers/employees/update');
const deleteEmployeeController = require('../controllers/employees/delete');
const setEmployeeStatusController = require('../controllers/employees/set_status');
const resetDataController = require('../controllers/employees/reset_data');
const { requirePermission } = require('../middlewares/require_permission');

employeeRouters.post('/add', addEmployeeController);
employeeRouters.put('/get', getEmployeeController);
employeeRouters.get('/get-all', getAllEmployeeController);
employeeRouters.put('/update', updateEmployeeController);
// Permanently remove an employee account (admin only).
employeeRouters.delete('/delete', requirePermission('employees.manage'), deleteEmployeeController);
// Deactivate / reactivate an account (admin only) — the record itself is kept.
employeeRouters.put('/status', requirePermission('employees.manage'), setEmployeeStatusController);
// Wipe all clinic data except admin accounts (admin only, body { confirm: "RESET" }).
employeeRouters.post('/reset-data', requirePermission('system.reset'), resetDataController);

module.exports = employeeRouters;