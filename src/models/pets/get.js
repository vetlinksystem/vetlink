const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const getPet = async (req_body) => {

    const {
        id,
    } = req_body;

    try {
        const response = await firestoreManager.getData('pets', id);
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports =  getPet;