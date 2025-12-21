const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const updateStatus = async (req_body) => {

    const {
        id,
        status
    } = req_body;

    try {
        const response = await firestoreManager.updatePartialData('breeding', {id, status});
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = updateStatus;