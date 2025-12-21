const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const dashboardRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

dashboardRouter.use(express.static(publicPath));

// ===== Controllers Import =====
const getTotalUserRegistered = require('../../../controllers/employee/dashboard/get_total_user_registered');
const getTotalPetRegistered = require('../../../controllers/employee/dashboard/get_total_pet_registererd');
const getTotalBreeds = require('../../../controllers/employee/dashboard/get_total_breeds');
const getTotalSuccessReservation = require('../../../controllers/employee/dashboard/get_total_success_appointments');
const getTotalPendingReservation = require('../../../controllers/employee/dashboard/get_total_pending_appointments');

const getRecentUsers = require('../../../controllers/employee/dashboard/get_recent_users');
const getRecentPets = require('../../../controllers/employee/dashboard/get_recent_pets');

// ===== Dashboard Page =====
dashboardRouter.get('/dashboard', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/dashboard.html'));
});

// ===== Dashboard APIs =====
dashboardRouter.get('/total-user-registered', authenticateApi, ensureTypeApi('employee'), getTotalUserRegistered);
dashboardRouter.get('/total-pet-registered', authenticateApi, ensureTypeApi('employee'), getTotalPetRegistered);
dashboardRouter.get('/total-breeds', authenticateApi, ensureTypeApi('employee'), getTotalBreeds);
dashboardRouter.get('/total-success-appointments', authenticateApi, ensureTypeApi('employee'), getTotalSuccessReservation);
dashboardRouter.get('/total-pending-appointments', authenticateApi, ensureTypeApi('employee'), getTotalPendingReservation);

dashboardRouter.get('/recent-users', authenticateApi, ensureTypeApi('employee'), getRecentUsers);
dashboardRouter.get('/recent-pets', authenticateApi, ensureTypeApi('employee'), getRecentPets);

module.exports = dashboardRouter;