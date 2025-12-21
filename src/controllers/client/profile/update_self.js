const updateClientSelfModel = require('../../../models/client/profile/update_self');

const updateClientSelfController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await updateClientSelfModel(user.id, req.body || {});

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Failed to update profile.'
      });
    }

    const { password, ...safe } = result.client || {};

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      client: safe
    });
  } catch (error) {
    console.error('Error updating client self:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating profile.',
      error: error.message
    });
  }
};

module.exports = updateClientSelfController;
