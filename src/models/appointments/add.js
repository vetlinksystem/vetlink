const firestoreManager = require ('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const addAppointment = async (req_body) => {

    const {
        id,
        clientId,
        dateTime,
        purpose
    } = req_body;

    const appointmentData = {
        'id': '123',
        clientId,
        dateTime,
        purpose
    }

    try {
        const response = await firestoreManager.addData('appointments', appointmentData);
        return response;
    } catch (error) {
        throw error; 
    }

}

module.exports = addAppointment; 