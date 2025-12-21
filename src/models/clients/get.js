const firestoreManager = require ('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const getClient = async (req_body) => {

    const {
        id,
    } = req_body;

     try {
        const response = await firestoreManager.getData('clients', id);
        return response;
     } catch (error) {
        throw error;
     }

}

module.export = getClient;