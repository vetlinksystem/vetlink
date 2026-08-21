const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');
const { requirePermission } = require('../../../middlewares/require_permission');

const recordsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

recordsRouter.use(express.static(publicPath));

/**
 * Employee-side Medical Records.
 *
 * Roles (see utilities/roles.js):
 *   Veterinarian / Admin — add and edit records
 *   Staff                — view and print only
 *   Pet owner            — views their own pets' records on /client/records
 */

// PAGE: /employee/records
recordsRouter.get(
  '/records',
  ensureAuthPage,
  ensureTypePage('employee'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/records.html'));
  }
);

// API: clinic-wide records list (view + print)
const getAllRecordsController = require('../../../controllers/employee/records/get_all_records');
recordsRouter.get(
  '/records/all',
  authenticateApi,
  ensureTypeApi('employee'),
  requirePermission('records.view'),
  getAllRecordsController
);

module.exports = recordsRouter;
