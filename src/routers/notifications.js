const express = require('express');
const router = express.Router();

const { ensureTypeApi } = require('../middlewares/auth');

const getMyNotificationsController = require('../controllers/notifications/get_my');
const markReadController = require('../controllers/notifications/mark_read');

// Client notifications
router.get('/my', ensureTypeApi('client'), getMyNotificationsController);
router.put('/mark-read', ensureTypeApi('client'), markReadController);

module.exports = router;
