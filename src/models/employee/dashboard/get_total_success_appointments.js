const firestoreManager = require('../../../fb/firestore_manager');
const utils = require('../../../utilities/utils');

const getTotalSuccessAppointments = async () => {

    try {
        // IMPORTANT:
        // Employee UI marks completed appointments with status "Completed" (title-case).
        // Older code used "Done". To avoid dashboard showing 0, count both.
        const all = await firestoreManager.getAllData('appointments', { "status": "" });

        const successStatuses = new Set(['completed', 'done']);
        const count = (all || []).filter(a => {
            const s = String(a?.status || '').trim().toLowerCase();
            return successStatuses.has(s);
        }).length;

        return count;
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalSuccessAppointments;