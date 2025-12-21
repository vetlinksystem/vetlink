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

// PAGE: /client/profile
profileRouter.get(
  '/profile',
  ensureAuthPage,
  ensureTypePage('client'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/profile.html'));
  }
);

// APIs
const getClientSelfController    = require('../../../controllers/client/profile/get_self');
const updateClientSelfController = require('../../../controllers/client/profile/update_self');

// GET /client/profile/me
profileRouter.get(
  '/profile/me',
  authenticateApi,
  ensureTypeApi('client'),
  getClientSelfController
);

// PUT /client/profile/me
profileRouter.put(
  '/profile/me',
  authenticateApi,
  ensureTypeApi('client'),
  updateClientSelfController
);

module.exports = profileRouter;
