const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const updateAppointment = async (req_body) => {

    const {
        id,
        clientId,
        dateTime,
        purpose
    } = req_body;

    const appointmentData = {
        id,
        clientId,
        dateTime,
        purpose
    }

    try {
        const response = await firestoreManager.updateData('appointments', appointmentData);
        return response;
    } catch (error) {
        throw error;
    }
    
}

module.exports = updateAppointment;