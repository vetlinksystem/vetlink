const express = require('express');
const router = express.Router();

const getMyNotificationsController = require('../controllers/notifications/get_my');
const markReadController = require('../controllers/notifications/mark_read');

// Notifications inbox (clients and employees — controller uses req.user.id,
// and mark-read verifies the notification belongs to the caller)
router.get('/my', getMyNotificationsController);
router.put('/mark-read', markReadController);

module.exports = router;
