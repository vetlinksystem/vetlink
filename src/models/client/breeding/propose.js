// src/models/client/breeding/propose.js
// A client proposes breeding between their own pet (petA) and another client's pet (petB).
// Record starts as "pending" until the other owner responds.
const firestoreManager = require('../../../fb/firestore_manager');
const { generateBreedingId } = require('../../../utilities/idGenerator');
const addNotification = require('../../notifications/add');
const {
    now, getPet, getClient, publicPet, isBreedingAllowed,
    getAllBreedingRecords, getMatchedPetMap, findOpenProposalBetween,
    findConversationBetween, getConversation, appendMessage
} = require('../../breeding/service');
const { assessPair, buildHealthInfo } = require('../../breeding/compatibility');

const OPPOSITE = { male: 'female', female: 'male' };

module.exports = async function proposeBreeding(clientId, req_body) {
    const { myPetId, targetPetId, message, conversationId } = req_body || {};

    if (!myPetId || !targetPetId) {
        return { success: false, message: 'myPetId and targetPetId are required.' };
    }

    const [myPet, targetPet] = await Promise.all([getPet(myPetId), getPet(targetPetId)]);

    if (!myPet || !targetPet) {
        return { success: false, message: 'One or both pets not found.' };
    }
    if (String(myPet.ownerId) !== String(clientId)) {
        return { success: false, message: 'You can only propose breeding with your own pet.' };
    }
    if (!targetPet.ownerId || String(targetPet.ownerId) === String(clientId)) {
        return { success: false, message: 'The selected pet must belong to another owner.' };
    }
    if (!isBreedingAllowed(myPet) || !isBreedingAllowed(targetPet)) {
        return { success: false, message: 'Both pets must be marked as available for breeding.' };
    }
    if (String(myPet.species || '').toLowerCase() !== String(targetPet.species || '').toLowerCase()) {
        return { success: false, message: 'Pets must be the same species.' };
    }
    const mySex = String(myPet.sex || '').toLowerCase();
    if (!OPPOSITE[mySex] || String(targetPet.sex || '').toLowerCase() !== OPPOSITE[mySex]) {
        return { success: false, message: 'Pets must be of opposite sex.' };
    }

    // Compatibility assessment (breed table, size gap, breeding age, health, temperament).
    // A pairing the table forbids, or one where either pet is underage, is refused here;
    // everything else is stored with the proposal so the veterinarian sees the reasoning
    // and the risk level when deciding.
    const allRecords = await firestoreManager.getAllData('records', {});
    const healthInfo = buildHealthInfo(allRecords, [myPet.id, targetPet.id]);
    const assessment = assessPair(myPet, targetPet, healthInfo);

    if (!assessment.eligible) {
        return { success: false, message: assessment.reason };
    }

    const records = await getAllBreedingRecords();
    const matched = getMatchedPetMap(records);
    if (matched[String(myPet.id)]) {
        return { success: false, message: `${myPet.name || 'Your pet'} already has a breeding match in progress.` };
    }
    if (matched[String(targetPet.id)]) {
        return { success: false, message: `${targetPet.name || 'That pet'} is no longer available for breeding.` };
    }

    const existing = findOpenProposalBetween(records, myPet.id, targetPet.id);
    if (existing) {
        const incoming = String(existing.ownerAId) !== String(clientId);
        return {
            success: false,
            message: incoming
                ? `${targetPet.name || 'That pet'}'s owner already proposed breeding with this pet. Check your proposals to respond.`
                : 'You already have an open proposal between these two pets.',
            existingId: existing.id
        };
    }

    const id = await generateBreedingId();
    const record = {
        id,
        petAId: myPet.id,
        petBId: targetPet.id,
        ownerAId: clientId,
        ownerBId: targetPet.ownerId,
        proposedBy: 'client',
        proposerId: clientId,
        message: (message || '').toString().trim(),
        notes: '',
        status: 'pending',
        requestedAt: now(),
        // Breeding type comes from the proposing pet's registration (purebred / crossbreed).
        breedingType: myPet.breedingType || '',
        breedingPurpose: myPet.breedingPurpose || '',
        // Snapshot of the assessment at proposal time, so the veterinarian sees the same
        // score and flags the owner saw, and so the reasoning is on the record.
        compatibility: {
            score: assessment.score,
            risk: assessment.risk,
            breedStatus: assessment.breedStatus,
            requiresVetReview: assessment.requiresVetReview,
            recommendation: assessment.recommendation,
            flags: assessment.flags,
            breakdown: assessment.breakdown,
            assessedAt: now()
        },
        // legacy flags kept for old readers: the proposer implicitly approves
        ownerAApproved: true,
        ownerBApproved: false
    };

    const ok = await firestoreManager.addData('breeding', record);
    if (!ok) {
        return { success: false, message: 'Failed to save breeding proposal.' };
    }

    // Notify the other owner (actionable: payload.breedingId drives accept/decline UIs)
    const proposer = await getClient(clientId);
    const proposerName = proposer?.name || 'Another pet owner';
    addNotification({
        clientId: targetPet.ownerId,
        type: 'breeding_proposal',
        title: 'New breeding proposal',
        message: `${proposerName} wants to breed their pet ${myPet.name || ''} (${myPet.breed || myPet.species || 'pet'}) with your pet ${targetPet.name || ''}.${record.message ? ` Message: "${record.message}"` : ''}`,
        payload: { breedingId: id, petAId: myPet.id, petBId: targetPet.id, proposerId: clientId }
    }).catch(() => {});

    // Drop a proposal card into their chat (existing conversation only)
    try {
        let convo = null;
        if (conversationId) {
            convo = await getConversation(conversationId);
            const ids = (convo?.participantIds || []).map(String);
            if (!convo || !ids.includes(String(clientId)) || !ids.includes(String(targetPet.ownerId))) convo = null;
        }
        if (!convo) convo = await findConversationBetween(clientId, targetPet.ownerId);
        if (convo) {
            await appendMessage(convo, {
                senderId: clientId,
                text: `Proposed breeding: ${myPet.name || 'my pet'} × ${targetPet.name || 'your pet'}`,
                type: 'breeding_proposal',
                payload: { breedingId: id, petAId: myPet.id, petBId: targetPet.id }
            });
        }
    } catch (_) { /* chat is optional */ }

    return {
        success: true,
        id,
        record: { ...record, myPet: publicPet(myPet), targetPet: publicPet(targetPet) },
        compatibility: record.compatibility
    };
};
