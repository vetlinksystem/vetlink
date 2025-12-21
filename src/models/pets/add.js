const firestoreManager = require('../../fb/firestore_manager');
const utils = require ('../../utilities/utils');
const { generatePetId } = require('../../utilities/idGenerator');

const addPet = async (req_body) => {

    const {
        name,
        breed,
        species,
        sex,
        dateOfBirth,
        age,
        weight,
        ownerId,
        allowBreeding
    } = req_body;

    const id = await generatePetId();

    const petData = {
        id,
        name,
        breed,
        species,
        sex,
        dateOfBirth,
        age,
        weight,
        ownerId,
        // Keep both keys for backward compatibility (older UI used allowBreeding)
        allowBreeding,
        breedingAllowed: typeof allowBreeding !== 'undefined' ? !!allowBreeding : undefined
    };

    try {
        const response = await firestoreManager.addData('pets', petData);
        return {
            success: !!response,
            id,
            pet: petData
        };
    } catch (error) {
        throw error;
    }

};

module.exports = addPet;