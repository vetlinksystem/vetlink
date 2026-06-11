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

// GET /client/notifications/my
notificationsRouter.get('/notifications/my', authenticateApi, ensureTypeApi('client'), getMyNotificationsController);

// PUT /client/notifications/mark-read
notificationsRouter.put('/notifications/mark-read', authenticateApi, ensureTypeApi('client'), markReadController);

// NOTE: PUT /client/breeding/respond moved to breeding_router.js

module.exports = notificationsRouter;
