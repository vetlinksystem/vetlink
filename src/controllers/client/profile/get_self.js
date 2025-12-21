const getClientSelfModel = require('../../../models/client/profile/get_self');

const getClientSelfController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await getClientSelfModel(user.id);

    if (!result || result.success === false) {
      return res.status(404).json({
        success: false,
        message: result?.message || 'Client not found.'
      });
    }

    return res.json({
      success: true,
      client: result.client
    });
  } catch (error) {
    console.error('Error getting client self:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading profile.',
      error: error.message
    });
  }
};

module.exports = getClientSelfController;
