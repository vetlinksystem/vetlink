const getMyNotifications = require('../../../models/notifications/get_my');

const getMyNotificationsController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const unreadOnly = String(req.query.unreadOnly || '').toLowerCase() === 'true';

    const result = await getMyNotifications(userId, { unreadOnly });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error while fetching notifications.' });
  }
};

module.exports = getMyNotificationsController;
