const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');

const recordsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

recordsRouter.use(express.static(publicPath));

// PAGE: /client/records
recordsRouter.get(
  '/records',
  ensureAuthPage,
  ensureTypePage('client'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/records.html'));
  }
);

// API: /client/records/my
const getMyRecordsController = require('../../../controllers/client/records/get_my_records');

recordsRouter.get(
  '/records/my',
  authenticateApi,
  ensureTypeApi('client'),
  getMyRecordsController
);

// Medical records are READ-ONLY for pet owners.
//
// Owners used to be able to create their own records here, which undermines the
// integrity of clinical information. Per the clinic's notes only veterinarians and
// administrators may add or edit records; staff may view and print them; the customer
// may only view. Creation now lives at POST /employee/records/:petId, gated by
// requirePermission('records.manage').
recordsRouter.post(
  '/records',
  authenticateApi,
  ensureTypeApi('client'),
  (req, res) => res.status(403).json({
    success: false,
    message: 'Medical records can only be added by the clinic. Please ask your veterinarian to record this visit.'
  })
);

module.exports = recordsRouter;
