const getMyNotifications = require('../../models/notifications/get_my');

const getMyNotificationsController = async (req, res) => {
  try {
    const clientId = req.user?.id || req.user?.uid;
    if (!clientId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await getMyNotifications(clientId);
    return res.json({ success: true, notifications: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

module.exports = getMyNotificationsController;
