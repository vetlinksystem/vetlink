const firestoreManager = require ('../../fb/firestore_manager');
const utils = require('../../utilities/utils');
const { generateClientId } = require('../../utilities/idGenerator');

const addClient = async (req_body) => {

    const {
        name, 
        address,
        email,
        number,
        password,
    } = req_body;

    // Use sequential, human-friendly IDs (c1001, c1002, ...)
    const id = await generateClientId();

    const clientData = {
        id,
        name,
        address,
        email,
        number,
        password,
    };

    try {
        const response = await firestoreManager.addData('clients', clientData);
        return {
            success: !!response,
            id,
            client: clientData
        };
    } catch (error) {
        throw error;
    }

};

module.exports = addClient;