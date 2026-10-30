const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');
const { deleteAppointmentsFor } = require('../../utilities/appointmentCleanup');

const deletePet = async (req_body) => {

    const {
        id,
    } = req_body;

    try {
        const response = await firestoreManager.deleteData('pets', id);
        // Their appointments would otherwise point at a pet that no longer exists.
        if (response) await deleteAppointmentsFor({ petId: id });
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = deletePet;