const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const updatePet = async (req_body) => {

    const {
        id,
        name,
        breed,
        species,
        sex,
        dateOfBirth,
        age,
        weight,
        ownerId
    } = req_body;

    const petData = {
        id,
        name,
        breed,
        species,
        sex,
        dateOfBirth,
        age,
        weight,
        ownerId
    }

    try {
        const response = await firestoreManager.updateData('pets', petData);
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = updatePet;