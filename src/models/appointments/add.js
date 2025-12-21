const firestoreManager = require ('../../fb/firestore_manager');
const utils = require('../../utilities/utils');
const { generateAppointmentId } = require('../../utilities/idGenerator');

const addAppointment = async (req_body) => {

    const {
        clientId,
        dateTime,
        purpose
    } = req_body;

    // Use sequential, human-friendly IDs (a1001, a1002, ...)
    const id = await generateAppointmentId();

    const appointmentData = {
        id,
        clientId,
        dateTime,
        purpose
    };

    try {
        const response = await firestoreManager.addData('appointments', appointmentData);
        return {
            success: !!response,
            id,
            appointment: appointmentData
        };
    } catch (error) {
        throw error; 
    }

};

module.exports = addAppointment; 