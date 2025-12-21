const firestoreManager = require('../../../fb/firestore_manager');
const utils = require('../../../utilities/utils');

const getRecentPets = async (req_params) => {

    const { limit } = req_params;

    try {
        const pets = await firestoreManager.getAllData('pets', {});
        pets.reverse();
        return pets.slice(0, limit);
    } catch (error) {
        throw error;
    }

}

module.exports = getRecentPets;