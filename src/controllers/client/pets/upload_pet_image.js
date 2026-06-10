const uploadPetImageModel = require('../../../models/client/pets/upload_pet_image');

const uploadPetImageController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const petId = req.params.id;
    const result = await uploadPetImageModel(user.id, petId, req.file);

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to upload pet image.',
      });
    }

    return res.json({ success: true, imageUrl: result.imageUrl });
  } catch (error) {
    console.error('Error uploading pet image:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while uploading pet image.',
      error: error.message,
    });
  }
};

module.exports = uploadPetImageController;
