const markNotificationRead = require('../../../models/notifications/mark_read');

const markReadController = async (req, res) => {
  try {
    const { id, read } = req.body || {};
    const result = await markNotificationRead(id, read);
    if (!result.success) return res.status(400).json(result);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error while updating notification.' });
  }
};

module.exports = markReadController;
