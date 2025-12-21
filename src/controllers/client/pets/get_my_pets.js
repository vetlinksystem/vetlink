const getMyPetsModel = require('../../../models/client/pets/get_my_pets');

const getMyPetsController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await getMyPetsModel(user.id);

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to load pets.'
      });
    }

    return res.json({
      success: true,
      pets: result.pets,
      total: result.total
    });
  } catch (error) {
    console.error('Error loading client pets:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading pets.',
      error: error.message
    });
  }
};

module.exports = getMyPetsController;
