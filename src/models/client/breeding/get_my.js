// src/models/client/breeding/get_my.js
// All breeding proposals involving the logged-in client, enriched with pet
// and owner details, newest first.
const firestoreManager = require('../../../fb/firestore_manager');
const { publicPet, publicOwner, getAllBreedingRecords } = require('../../breeding/service');

module.exports = async function getMyProposals(clientId) {
    const records = await getAllBreedingRecords();
    const mine = records.filter(r =>
        String(r.ownerAId) === String(clientId) || String(r.ownerBId) === String(clientId)
    );

    const [allPets, allClients] = await Promise.all([
        firestoreManager.getAllData('pets', {}),
        firestoreManager.getAllData('clients', {})
    ]);
    const petById = {};
    (allPets || []).forEach(p => { petById[String(p.id)] = p; });
    const clientById = {};
    (allClients || []).forEach(c => { clientById[String(c.id)] = c; });

    const proposals = mine.map(r => {
        const iAmA = String(r.ownerAId) === String(clientId);
        const myPetId = iAmA ? r.petAId : r.petBId;
        const otherPetId = iAmA ? r.petBId : r.petAId;
        const otherOwnerId = iAmA ? r.ownerBId : r.ownerAId;

        // Direction relative to me. Legacy clinic records have no proposer.
        const proposedBy = r.proposedBy || 'clinic';
        let direction = 'clinic';
        if (proposedBy === 'client') {
            direction = String(r.proposerId || r.ownerAId) === String(clientId) ? 'outgoing' : 'incoming';
        }

        return {
            id: r.id,
            status: r.status || 'pending',
            direction,
            proposedBy,
            message: r.message || '',
            requestedAt: r.requestedAt || '',
            respondedAt: r.respondedAt || '',
            decidedAt: r.decidedAt || '',
            cancelReason: r.cancelReason || '',
            myPet: publicPet(petById[String(myPetId)]) || { id: myPetId, name: myPetId },
            otherPet: publicPet(petById[String(otherPetId)]) || { id: otherPetId, name: otherPetId },
            otherOwner: publicOwner(clientById[String(otherOwnerId)]) || { id: otherOwnerId, name: 'Pet owner' }
        };
    }).sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));

    return { success: true, proposals, total: proposals.length };
};
