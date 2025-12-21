const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');

const appointmentsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

appointmentsRouter.use(express.static(publicPath));

appointmentsRouter.get(
  '/appointments',
  ensureAuthPage,
  ensureTypePage('client'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/appointments.html'));
  }
);

const getMyAppointmentsController = require('../../../controllers/client/appointments/get_my_appointments');
const addClientAppointmentController = require('../../../controllers/client/appointments/add');

appointmentsRouter.get(
  '/appointments/my',
  authenticateApi,
  ensureTypeApi('client'),
  getMyAppointmentsController
);

appointmentsRouter.post(
  '/appointments',
  authenticateApi,
  ensureTypeApi('client'),
  addClientAppointmentController
);

module.exports = appointmentsRouter;
