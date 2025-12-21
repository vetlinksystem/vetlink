const firestoreManager = require('../../../fb/firestore_manager');
const utils = require('../../../utilities/utils');

const getTotalPetRegistered = async () => {

    try {
        const response = await firestoreManager.getAllData('pets', {});
        return response.length;
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalPetRegistered;