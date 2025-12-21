const firestoreManager = require ('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const addClient = async (req_body) => {

    const {
        name, 
        address,
        email,
        number,
        password,
    } = req_body;

    const clientData = {
        "id" : "123",
        name,
        address,
        email,
        number,
        password,
    }

    try {
        const response = await firestoreManager.addData('clients', clientData);
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = addClient;