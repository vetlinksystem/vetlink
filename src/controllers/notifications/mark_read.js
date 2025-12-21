const markRead = require('../../models/notifications/mark_read');

const markReadController = async (req, res) => {
  try {
    const clientId = req.user?.id || req.user?.uid;
    const { id } = req.body || {};

    if (!clientId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing notification id' });
    }

    const ok = await markRead(clientId, id);
    if (!ok) return res.status(404).json({ success: false, message: 'Notification not found' });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error marking read' });
  }
};

module.exports = markReadController;
