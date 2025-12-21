const firestoreManager = require('../../../fb/firestore_manager');
const utils = require('../../../utilities/utils');

const getTotalPendingAppointments = async () => {

    try {
        const response = await firestoreManager.getAllData('appointments', { "status": "Pending" });
        return response.length;
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalPendingAppointments;