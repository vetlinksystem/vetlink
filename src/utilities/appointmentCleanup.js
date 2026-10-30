// src/utilities/appointmentCleanup.js
// Removes the appointments that belong to a client or pet being deleted.
//
// Without this, deleting a client or pet left their appointments behind pointing at a
// record that no longer exists, and the appointments list could only show "#c1009".
// Matching is done here with exact equality, because firestoreManager.getAllData()
// filters by substring ("c100" would also match "c1009").

const firestoreManager = require('../fb/firestore_manager');

/**
 * Delete every appointment whose owner is `ownerId` or whose pet is `petId`.
 * Returns the number of appointments removed.
 */
const deleteAppointmentsFor = async ({ ownerId, petId } = {}) => {
    const owner = ownerId ? String(ownerId).trim() : '';
    const pet = petId ? String(petId).trim() : '';
    if (!owner && !pet) return 0;

    const all = await firestoreManager.getAllData('appointments', {});
    const matches = (Array.isArray(all) ? all : []).filter((a) =>
        (owner && String(a.ownerId ?? a.clientId ?? '').trim() === owner) ||
        (pet && String(a.petId ?? '').trim() === pet)
    );

    await Promise.all(matches.map((a) => firestoreManager.deleteData('appointments', String(a.id))));
    return matches.length;
};

module.exports = { deleteAppointmentsFor };
