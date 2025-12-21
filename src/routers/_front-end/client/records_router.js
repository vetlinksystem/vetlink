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

module.exports = recordsRouter;
