const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const getAllPet = async (req_body) => {

    try {
        const response = await firestoreManager.getAllData('pets', {});

        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = getAllPet;