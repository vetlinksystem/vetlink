const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const getAllAppointment = async (req_body) => {

    const {
        clientId,
        dateTime
    } = req_body;

    const AppointmentData = {
        clientId, 
        dateTime
    }

    try {
        const response = await firestoreManager.getAllData('appointments', AppointmentData);
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = getAllAppointment;