const firestoreManager = require('../../fb/firestore_manager');
const utils = require ('../../utilities/utils');

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

    const petData = {
        "id":"1234",
        name,
        breed,
        species,
        sex,
        dateOfBirth,
        "age": utils.toNumber(age),
        weight,
        ownerId,
        allowBreeding
    }

    try {
        console.log(petData);
        const response = await firestoreManager.addData('pets', petData);
        return response; 
    } catch (error) {
        throw error;
    }

}

module.exports = addPet;