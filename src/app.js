const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== API Routers =====
const employeeRouter        = require('./routers/employees');
const clientRouter          = require('./routers/clients');
const appointmentRouter     = require('./routers/appointments');
const petRouter             = require('./routers/pets');


// ===== Front-end Routers =====
const loginRouter           = require('./routers/_front-end/login/login_router');

const empDashboardRouter    = require('./routers/_front-end/employee/dashboard_router');
const empUserRouter         = require('./routers/_front-end/employee/users_router');
const empManageEmpRouter    = require('./routers/_front-end/employee/employees_router');
const empScheduleRouter     = require('./routers/_front-end/employee/schedule_router');
const empReservationRouter  = require('./routers/_front-end/employee/reservation_router');
const empProfileRouter      = require('./routers/_front-end/employee/profile_router');
const empManagePetsRouter   = require('./routers/_front-end/employee/pets_router');

const cliDashboardRouter    = require('./routers/_front-end/client/dashboard_router');
const cliPetsRouter         = require('./routers/_front-end/client/pets_router');
const cliAppointmentsRouter = require('./routers/_front-end/client/appointments_router');
const cliReservationsRouter = require('./routers/_front-end/client/reservations_router');
const cliRecordsRouter      = require('./routers/_front-end/client/records_router');
const cliProfileRouter      = require('./routers/_front-end/client/profile_router');

// ===== Middlewares =====
const { authenticateApi }   = require('./middlewares/auth');


// ===== API Endpoints =====
app.use('/employees',       authenticateApi, employeeRouter);
app.use('/clients',         authenticateApi, clientRouter);
app.use('/appointments',    authenticateApi, appointmentRouter);
app.use('/pets',            authenticateApi, petRouter);

// pages
app.use('', loginRouter);

app.use('/employee', empDashboardRouter);
app.use('/employee', empUserRouter);
app.use('/employee', empManageEmpRouter);
app.use('/employee', empScheduleRouter);
app.use('/employee', empReservationRouter);
app.use('/employee', empProfileRouter);
app.use('/employee', empManagePetsRouter);

app.use('/client', cliDashboardRouter); 
app.use('/client', cliPetsRouter);
app.use('/client', cliAppointmentsRouter);
app.use('/client', cliReservationsRouter);
app.use('/client', cliRecordsRouter);
app.use('/client', cliProfileRouter);

const errorHandler          = require('./middlewares/error-handler');
app.use(errorHandler);

module.exports = app;