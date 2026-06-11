// src/models/client/breeding/respond.js
// The owner of the target pet (ownerB) accepts or declines a client proposal.
// Accepting moves the record to "accepted" and notifies the clinic admins,
// who give the final approval.
const firestoreManager = require('../../../fb/firestore_manager');
const addNotification = require('../../notifications/add');
const {
    now, getPet, getClient, notifyAdmins, systemMessageBetween
} = require('../../breeding/service');

module.exports = async function respondToProposal(clientId, req_body) {
    const { id, decision } = req_body || {};

    if (!id || !decision) {
        return { success: false, message: 'id and decision are required.' };
    }

    const record = await firestoreManager.getData('breeding', String(id));
    if (!record) {
        return { success: false, message: 'Breeding proposal not found.' };
    }
    if (String(record.ownerBId) !== String(clientId)) {
        return { success: false, message: 'Only the owner of the requested pet can respond to this proposal.' };
    }
    if (String(record.status) !== 'pending') {
        return { success: false, message: `This proposal is already ${record.status}.` };
    }

    const accept = ['accept', 'approve', 'yes'].includes(String(decision).toLowerCase());
    const decline = ['decline', 'reject', 'no'].includes(String(decision).toLowerCase());
    if (!accept && !decline) {
        return { success: false, message: 'Unknown decision value.' };
    }

    const [petA, petB, ownerB] = await Promise.all([
        getPet(record.petAId), getPet(record.petBId), getClient(clientId)
    ]);
    const petAName = petA?.name || record.petAId;
    const petBName = petB?.name || record.petBId;
    const ownerBName = ownerB?.name || 'The other owner';

    if (decline) {
        const ok = await firestoreManager.updatePartialData('breeding', {
            id: record.id,
            status: 'rejected',
            rejectedBy: 'owner',
            respondedAt: now()
        });
        if (!ok) return { success: false, message: 'Failed to update proposal.' };

        addNotification({
            clientId: record.ownerAId,
            type: 'breeding_update',
            title: 'Breeding proposal declined',
            message: `${ownerBName} declined your breeding proposal (${petAName} × ${petBName}).`,
            payload: { breedingRef: record.id }
        }).catch(() => {});

        await systemMessageBetween(
            record.ownerAId, record.ownerBId,
            `Breeding proposal declined: ${petAName} × ${petBName}.`,
            { breedingRef: record.id }
        );

        return { success: true, id: record.id, status: 'rejected' };
    }

    // Accept → waiting for clinic approval
    const ok = await firestoreManager.updatePartialData('breeding', {
        id: record.id,
        status: 'accepted',
        ownerBApproved: true,
        respondedAt: now()
    });
    if (!ok) return { success: false, message: 'Failed to update proposal.' };

    addNotification({
        clientId: record.ownerAId,
        type: 'breeding_update',
        title: 'Breeding proposal accepted 🎉',
        message: `${ownerBName} accepted your breeding proposal (${petAName} × ${petBName}). The clinic will review and approve it.`,
        payload: { breedingRef: record.id }
    }).catch(() => {});

    notifyAdmins({
        type: 'breeding_review',
        title: 'Breeding pair needs approval',
        message: `Both owners agreed on breeding ${petAName} × ${petBName}. Review it on the Breeding page.`,
        payload: { breedingRef: record.id }
    }).catch(() => {});

    await systemMessageBetween(
        record.ownerAId, record.ownerBId,
        `Breeding proposal accepted: ${petAName} × ${petBName}. Waiting for clinic approval.`,
        { breedingRef: record.id }
    );

    return { success: true, id: record.id, status: 'accepted' };
};
