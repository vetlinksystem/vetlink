const express = require('express');
const employeeRouters = express.Router();

const addEmployeeController = require('../controllers/employees/add');
const getEmployeeController = require('../controllers/employees/get');
const getAllEmployeeController = require('../controllers/employees/get_all');
const updateEmployeeController = require('../controllers/employees/update');
const deleteEmployeeController = require('../controllers/employees/delete');

employeeRouters.post('/add', addEmployeeController);
employeeRouters.put('/get', getEmployeeController);
employeeRouters.get('/get-all', getAllEmployeeController);
employeeRouters.put('/update', updateEmployeeController);
employeeRouters. delete('/delete', deleteEmployeeController);

module.exports = employeeRouters;