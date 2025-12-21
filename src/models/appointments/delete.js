const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const deleteAppointment = async (req_body) => {

    const {
        id,
    } = req_body;

    try {
        const response = await firestoreManager.deleteData('appointments', id);
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = deleteAppointment;