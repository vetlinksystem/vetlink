const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const dashboardRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

dashboardRouter.use(express.static(publicPath));

// ===== Page =====
dashboardRouter.get('/dashboard', ensureAuthPage, ensureTypePage('client'), (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/dashboard.html'));
});

// ===== APIs =====
const getClientDashboardOverviewController = require('../../../controllers/client/dashboard/get_overview');

dashboardRouter.get(
  '/dashboard/overview',
  authenticateApi,
  ensureTypeApi('client'),
  getClientDashboardOverviewController
);

module.exports = dashboardRouter;
