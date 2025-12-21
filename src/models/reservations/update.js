const firestoreManager = require('../../fb/firestore_manager');

const updateReservation = async (id, payload) => {
    if (!id) {
        return { success: false, message: 'Reservation id is required.' };
    }

    const updateData = {
        id,
        ...payload,
        updatedAt: new Date().toISOString()
    };

    try {
        const ok = await firestoreManager.updatePartialData('reservations', updateData);
        if (!ok) {
            return { success: false, message: 'Failed to update reservation.' };
        }

        // Fetch updated reservation from DB
        const list = await firestoreManager.getAllData('reservations', { id });
        const reservation = Array.isArray(list) ? list.find(r => r.id === id) : null;

        return { success: true, reservation: reservation || updateData };
    } catch (error) {
        throw error;
    }
};

module.exports = updateReservation;
