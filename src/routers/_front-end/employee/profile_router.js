const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');

const profileRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

profileRouter.use(express.static(publicPath));

// ===== PAGE ROUTE =====
profileRouter.get(
  '/profile',
  ensureAuthPage,
  ensureTypePage('employee'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/profile.html'));
  }
);

// ===== API CONTROLLERS =====
const getEmployeeSelfController   = require('../../../controllers/employee/profile/get_self');
const updateEmployeeSelfController = require('../../../controllers/employee/profile/update_self');

// GET /employee/profile/me
profileRouter.get(
  '/profile/me',
  authenticateApi,
  ensureTypeApi('employee'),
  getEmployeeSelfController
);

// PUT /employee/profile/me
profileRouter.put(
  '/profile/me',
  authenticateApi,
  ensureTypeApi('employee'),
  updateEmployeeSelfController
);

module.exports = profileRouter;
