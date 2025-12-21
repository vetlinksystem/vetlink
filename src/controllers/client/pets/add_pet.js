const addClientPetModel = require('../../../models/client/pets/add_pet');

const addClientPetController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await addClientPetModel(user.id, req.body);
    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to save pet.'
      });
    }

    return res.status(201).json({
      success: true,
      id: result.id,
      pet: result.pet
    });
  } catch (error) {
    console.error('Error adding client pet:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving pet.',
      error: error.message
    });
  }
};

module.exports = addClientPetController;
