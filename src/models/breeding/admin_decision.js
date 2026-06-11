// src/models/breeding/admin_decision.js
// Clinic (vet/admin employee) gives the final decision on a breeding pair
// that both owners already agreed on.
// Approve → record "approved", both pets become unavailable for breeding,
// every other open proposal involving either pet is auto-cancelled.
const firestoreManager = require('../../fb/firestore_manager');
const addNotification = require('../notifications/add');
const {
    now, getPet, systemMessageBetween, cancelCompetingProposals
} = require('./service');

module.exports = async function adminDecision(employee, req_body) {
    const { id, decision, notes } = req_body || {};

    if (!id || !decision) {
        return { success: false, message: 'id and decision are required.' };
    }

    const record = await firestoreManager.getData('breeding', String(id));
    if (!record) {
        return { success: false, message: 'Breeding record not found.' };
    }

    const approve = String(decision).toLowerCase() === 'approve';
    const reject = String(decision).toLowerCase() === 'reject';
    if (!approve && !reject) {
        return { success: false, message: 'Unknown decision value.' };
    }

    if (approve && String(record.status) !== 'accepted') {
        return { success: false, message: 'Only proposals accepted by both owners can be approved.' };
    }
    if (reject && !['pending', 'accepted'].includes(String(record.status))) {
        return { success: false, message: `This record is already ${record.status}.` };
    }

    const [petA, petB] = await Promise.all([getPet(record.petAId), getPet(record.petBId)]);
    const petAName = petA?.name || record.petAId;
    const petBName = petB?.name || record.petBId;
    const pairLabel = `${petAName} × ${petBName}`;
    const owners = [record.ownerAId, record.ownerBId]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);

    if (reject) {
        const ok = await firestoreManager.updatePartialData('breeding', {
            id: record.id,
            status: 'rejected',
            rejectedBy: 'admin',
            adminId: employee?.id || '',
            adminNotes: (notes || '').toString(),
            decidedAt: now()
        });
        if (!ok) return { success: false, message: 'Failed to update record.' };

        for (const ownerId of owners) {
            addNotification({
                clientId: ownerId,
                type: 'breeding_update',
                title: 'Breeding not approved',
                message: `The clinic did not approve the breeding ${pairLabel}.${notes ? ` Note: ${notes}` : ''}`,
                payload: { breedingRef: record.id }
            }).catch(() => {});
        }

        await systemMessageBetween(
            record.ownerAId, record.ownerBId,
            `The clinic did not approve the breeding ${pairLabel}.${notes ? ` Note: ${notes}` : ''}`,
            { breedingRef: record.id }
        );

        return { success: true, id: record.id, status: 'rejected' };
    }

    // Approve
    const ok = await firestoreManager.updatePartialData('breeding', {
        id: record.id,
        status: 'approved',
        adminId: employee?.id || '',
        adminNotes: (notes || '').toString(),
        decidedAt: now()
    });
    if (!ok) return { success: false, message: 'Failed to update record.' };

    // Mark both pets as matched (kept on the pet doc for quick lookups)
    for (const pid of [record.petAId, record.petBId]) {
        if (!pid) continue;
        firestoreManager.updatePartialData('pets', {
            id: String(pid),
            breedingMatchId: record.id,
            breedingMatchedAt: now()
        }).catch(() => {});
    }

    for (const ownerId of owners) {
        addNotification({
            clientId: ownerId,
            type: 'breeding_update',
            title: 'Breeding approved ✅',
            message: `The clinic approved the breeding ${pairLabel}. Both pets are now reserved for this breeding and hidden from the match list.`,
            payload: { breedingRef: record.id }
        }).catch(() => {});
    }

    await systemMessageBetween(
        record.ownerAId, record.ownerBId,
        `The clinic approved the breeding ${pairLabel}! 🎉 Both pets are now reserved for this breeding.`,
        { breedingRef: record.id }
    );

    // Other open proposals involving these pets are now dead — tell those owners.
    const cancelled = await cancelCompetingProposals(record, [petA, petB].filter(Boolean));

    return { success: true, id: record.id, status: 'approved', cancelledOthers: cancelled };
};
