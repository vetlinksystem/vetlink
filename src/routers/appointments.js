const express = require('express');
const appointmentRouters = express.Router();

const addAppointmentController = require('../controllers/appointments/add');
const getAppointmentController = require('../controllers/appointments/get');
const getAllAppointmentController = require('../controllers/appointments/get_all');
const updateAppointmentController = require('../controllers/appointments/update');
const deleteAppointmentController = require('../controllers/appointments/delete');

// REST-style endpoints used by Employee UI (non-breaking: kept in addition to legacy ones)
const listAppointmentsController = require('../controllers/appointments/list');
const createAppointmentController = require('../controllers/appointments/create');
const updateAppointmentPartialController = require('../controllers/appointments/update_partial');


appointmentRouters.post('/add', addAppointmentController);
appointmentRouters.put('/get', getAppointmentController);
appointmentRouters.put('/get_all', getAllAppointmentController);
appointmentRouters.put('/update', updateAppointmentController);
appointmentRouters.delete('/delete', deleteAppointmentController);

// ===== REST endpoints =====
// GET /appointments?limit=100&offset=0
appointmentRouters.get('/', listAppointmentsController);
// POST /appointments
appointmentRouters.post('/', createAppointmentController);
// PUT /appointments/:id  (partial update: status/notes/dateTime/etc.)
appointmentRouters.put('/:id', updateAppointmentPartialController);


module.exports = appointmentRouters;