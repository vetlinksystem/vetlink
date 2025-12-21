const updatePetModel = require('../../models/pets/update');

const updatePetsController = async (req, res) => {

    const modelResponse = await updatePetModel(req.body);

    try {
        if (modelResponse) {
            return res.send("Pet updated successfully!");
        } else {
            return res.send("Failed to update Pet!");
        }
    } catch (error) {
        throw error;
    }

}

module.exports = updatePetsController;