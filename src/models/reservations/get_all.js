const firestoreManager = require('../../fb/firestore_manager');

const getAllReservations = async (query) => {
    try {
        const response = await firestoreManager.getAllData('reservations', {});
        return Array.isArray(response) ? response : [];
    } catch (error) {
        throw error;
    }
};

module.exports = getAllReservations;
