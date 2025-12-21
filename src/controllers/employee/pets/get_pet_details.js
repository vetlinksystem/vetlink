const getPetDetailsModel = require('../../../models/employee/pets/get_pet_details');

// GET /employee/pets/get?id=<petId>
const getPetDetails = async (req, res) => {
  try {
    const id = (req.query && req.query.id) ? String(req.query.id) : '';

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Missing pet id.'
      });
    }

    const result = await getPetDetailsModel(id);
    if (!result || result.success === false) {
      return res.status(404).json({
        success: false,
        message: result?.message || 'Pet not found.'
      });
    }

    return res.json({
      success: true,
      pet: result.pet,
      owner: result.owner || null
    });
  } catch (error) {
    console.error('employee get_pet_details error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading pet details.',
      error: error.message
    });
  }
};

module.exports = getPetDetails;
