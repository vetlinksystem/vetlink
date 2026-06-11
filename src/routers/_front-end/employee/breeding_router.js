// src/routers/_front-end/employee/breeding_router.js
// Breeding approvals page for vet/admin employees.
// Data APIs live under /breeding (get-all, admin-decision).
const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage
} = require('../../../middlewares/auth');

const breedingRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

// PAGE: /employee/breeding
breedingRouter.get(
  '/breeding',
  ensureAuthPage,
  ensureTypePage('employee'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/breeding.html'));
  }
);

module.exports = breedingRouter;
