const getAllPetModel = require('../../models/pets/get_all');

const getAllPetsController = async (req, res) => {
    try {
        const pets = await getAllPetModel();
        return res.send(pets);
    } catch (error) {
        console.error(error);
        return res.status(500).send([]);
    }
};

module.exports = getAllPetsController;
