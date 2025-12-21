const firestoreManager = require('../../../fb/firestore_manager');
const utils = require('../../../utilities/utils');

const getTotalSuccessAppointments = async () => {

    try {
        const response = await firestoreManager.getAllData('appointments', { "status": "Done" });
        return response.length;
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalSuccessAppointments;