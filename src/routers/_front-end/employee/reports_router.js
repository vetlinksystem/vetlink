const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');
const { requirePermission } = require('../../../middlewares/require_permission');

const reportsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

reportsRouter.use(express.static(publicPath));

/**
 * Employee-side Reports.
 *
 * Every figure is derived from the live collections, so the report generates itself
 * for whichever period is asked for — no manual entry, and the API can be polled on
 * a schedule to produce the same report unattended.
 *
 * Roles: admin, staff and vet may all view reports (same as analytics).
 */

// PAGE: /employee/reports
reportsRouter.get(
  '/reports',
  ensureAuthPage,
  ensureTypePage('employee'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/reports.html'));
  }
);

// API: GET /employee/reports/data?preset=this-month  (or ?from=&to=)
const getReportController = require('../../../controllers/employee/reports/get_report');
reportsRouter.get(
  '/reports/data',
  authenticateApi,
  ensureTypeApi('employee'),
  requirePermission('analytics.view'),
  getReportController
);

module.exports = reportsRouter;
