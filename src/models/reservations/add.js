const firestoreManager = require('../../fb/firestore_manager');

const addReservation = async (req_body) => {
    const {
        date,
        time,
        purpose,
        ownerId,
        petId,
        notes
    } = req_body;

    // Simple time-based id (string, unique enough for now)
    const id = 'r' + Date.now();

    const reservationData = {
        id,
        date,
        time,
        purpose,
        ownerId,
        petId,
        notes: notes || '',
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    try {
        const ok = await firestoreManager.addData('reservations', reservationData);
        if (!ok) {
            return { success: false, message: 'Failed to save reservation.' };
        }
        return { success: true, reservation: reservationData };
    } catch (error) {
        throw error;
    }
};

module.exports = addReservation;
