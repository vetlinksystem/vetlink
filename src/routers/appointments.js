const express = require('express');
const appointmentRouters = express.Router();

const addAppointmentController = require('../controllers/appointments/add');
const getAppointmentController = require('../controllers/appointments/get');
const getAllAppointmentController = require('../controllers/appointments/get_all');
const updateAppointmentController = require('../controllers/appointments/update');
const deleteAppointmentController = require('../controllers/appointments/delete');


appointmentRouters.post('/add', addAppointmentController);
appointmentRouters.put('/get', getAppointmentController);
appointmentRouters.put('/get_all', getAllAppointmentController);
appointmentRouters.put('/update', updateAppointmentController);
appointmentRouters.delete('/delete', deleteAppointmentController);


module.exports = appointmentRouters;