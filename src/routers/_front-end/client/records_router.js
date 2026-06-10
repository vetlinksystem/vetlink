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
const addRecordController = require('../../../controllers/client/records/add_record');
const { uploadRecordFile } = require('../../../middlewares/upload');

recordsRouter.get(
  '/records/my',
  authenticateApi,
  ensureTypeApi('client'),
  getMyRecordsController
);

// API: POST /client/records (multipart; text fields + optional "file")
recordsRouter.post(
  '/records',
  authenticateApi,
  ensureTypeApi('client'),
  uploadRecordFile,
  addRecordController
);

module.exports = recordsRouter;
