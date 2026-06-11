// src/models/client/breeding/cancel.js
// The proposer withdraws their own pending proposal.
const firestoreManager = require('../../../fb/firestore_manager');
const addNotification = require('../../notifications/add');
const { now, getPet, getClient, systemMessageBetween } = require('../../breeding/service');

module.exports = async function cancelProposal(clientId, req_body) {
    const { id } = req_body || {};
    if (!id) {
        return { success: false, message: 'id is required.' };
    }

    const record = await firestoreManager.getData('breeding', String(id));
    if (!record) {
        return { success: false, message: 'Breeding proposal not found.' };
    }
    const proposerId = record.proposerId || record.ownerAId;
    if (String(proposerId) !== String(clientId)) {
        return { success: false, message: 'Only the proposer can cancel this proposal.' };
    }
    if (String(record.status) !== 'pending') {
        return { success: false, message: `Only pending proposals can be cancelled (this one is ${record.status}).` };
    }

    const ok = await firestoreManager.updatePartialData('breeding', {
        id: record.id,
        status: 'cancelled',
        cancelReason: 'withdrawn_by_proposer',
        decidedAt: now()
    });
    if (!ok) return { success: false, message: 'Failed to cancel proposal.' };

    const [petA, petB, proposer] = await Promise.all([
        getPet(record.petAId), getPet(record.petBId), getClient(clientId)
    ]);
    const petAName = petA?.name || record.petAId;
    const petBName = petB?.name || record.petBId;

    addNotification({
        clientId: record.ownerBId,
        type: 'breeding_update',
        title: 'Breeding proposal withdrawn',
        message: `${proposer?.name || 'The other owner'} withdrew the breeding proposal (${petAName} × ${petBName}).`,
        payload: { breedingRef: record.id }
    }).catch(() => {});

    await systemMessageBetween(
        record.ownerAId, record.ownerBId,
        `Breeding proposal withdrawn: ${petAName} × ${petBName}.`,
        { breedingRef: record.id }
    );

    return { success: true, id: record.id, status: 'cancelled' };
};
