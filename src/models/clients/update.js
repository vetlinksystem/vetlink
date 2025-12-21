const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const updateClient = async (req_body) => {

    const {
        id,
        name,
        address,
        email,
        number,
        password
    } = req_body;

    const clientData = {
        id,
        name,
        address,
        email,
        number,
        password
    }

    try {
        const response = await firestoreManager.updateData('clients', clientData);
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = updateClient;