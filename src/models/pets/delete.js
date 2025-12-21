const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const deletePet = async (req_body) => {

    const {
        id,
    } = req_body;

    try {
        const response = await firestoreManager.deleteData('pets', id);
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = deletePet;