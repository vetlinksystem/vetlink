const express = require('express');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');

const notificationsRouter = express.Router();

// APIs
const getMyNotificationsController = require('../../../controllers/client/notifications/get_my');
const markReadController = require('../../../controllers/client/notifications/mark_read');
const respondBreedingController = require('../../../controllers/client/breeding/respond');

// GET /client/notifications/my
notificationsRouter.get('/notifications/my', authenticateApi, ensureTypeApi('client'), getMyNotificationsController);

// PUT /client/notifications/mark-read
notificationsRouter.put('/notifications/mark-read', authenticateApi, ensureTypeApi('client'), markReadController);

// PUT /client/breeding/respond
notificationsRouter.put('/breeding/respond', authenticateApi, ensureTypeApi('client'), respondBreedingController);

module.exports = notificationsRouter;
