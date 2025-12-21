const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const getAllClient = async (req_body) => {

    try {
        const response = await firestoreManager.getAllData('clients' , {});
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = getAllClient;