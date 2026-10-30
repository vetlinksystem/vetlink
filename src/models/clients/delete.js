const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');
const { deleteAppointmentsFor } = require('../../utilities/appointmentCleanup');

const deleteClient = async (req_body) => {

    const {
        id,
    } = req_body;

    try {
        const response = await firestoreManager.deleteData('clients', id);
        // Their appointments would otherwise point at a client that no longer exists.
        if (response) await deleteAppointmentsFor({ ownerId: id });
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = deleteClient;