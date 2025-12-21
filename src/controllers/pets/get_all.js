const getAllPetModel = require('../../models/pets/get_all');

const getAllPetsController = async(req, res) => {

    const modelResponse = await getAllPetModel(req.body);

    try {
        return res.send(modelResponse);
    } catch (error) {
        throw error;
    }

}

module.exports = getAllPetsController;