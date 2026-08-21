const getPetRegisterModel = require('../../../models/employee/pets/get_pet_register');

// GET /employee/pets/register?q=&species=&sex=&breedingOnly=&ownerId=
// "Pet Records" — the clinic-wide register of all pets.
const getPetRegisterController = async (req, res) => {
  try {
    const { q, species, sex, breedingOnly, ownerId } = req.query || {};

    const result = await getPetRegisterModel({
      q,
      species,
      sex,
      ownerId,
      breedingOnly: breedingOnly === 'true' || breedingOnly === '1'
    });

    return res.json({
      success: true,
      pets: result.pets,
      summary: result.summary
    });
  } catch (error) {
    console.error('Error loading pet register (employee):', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading the pet register.',
      error: error.message
    });
  }
};

module.exports = getPetRegisterController;
