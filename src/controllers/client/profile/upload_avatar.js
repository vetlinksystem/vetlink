const uploadAvatarModel = require('../../../models/client/profile/upload_avatar');

const uploadAvatarController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const result = await uploadAvatarModel(user.id, req.file);

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to upload avatar.',
      });
    }

    return res.json({ success: true, avatarUrl: result.avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while uploading avatar.',
      error: error.message,
    });
  }
};

module.exports = uploadAvatarController;
