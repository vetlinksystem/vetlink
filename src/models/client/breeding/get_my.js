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
            otherOwner: publicOwner(clientById[String(otherOwnerId)]) || { id: otherOwnerId, name: 'Pet owner' },

            // Compatibility guidance the owner already saw when proposing.
            compatibility: r.compatibility
                ? {
                    score: r.compatibility.score,
                    risk: r.compatibility.risk,
                    breedStatus: r.compatibility.breedStatus,
                    recommendation: r.compatibility.recommendation,
                    flags: r.compatibility.flags || []
                }
                : null,

            // Clinic decision: conditions attached at approval, if any.
            decisionOutcome: r.decisionOutcome || '',
            conditions: Array.isArray(r.conditions) ? r.conditions : [],

            // Final pre-breeding examination (step 9).
            clearance: r.clearance
                ? {
                    petAFit: r.clearance.petAFit,
                    petBFit: r.clearance.petBFit,
                    findings: r.clearance.findings || '',
                    examinedAt: r.clearance.examinedAt || ''
                }
                : null,

            // The breeding record and pregnancy monitoring (step 10 / post-breeding care).
            breedingDetails: r.breedingDetails
                ? {
                    combination: r.breedingDetails.combination,
                    breedingType: r.breedingDetails.breedingType,
                    sireName: r.breedingDetails.sireName,
                    damName: r.breedingDetails.damName,
                    breedingDate: r.breedingDetails.breedingDate,
                    matingType: r.breedingDetails.matingType,
                    expectedDueDate: r.breedingDetails.expectedDueDate,
                    studFee: r.breedingDetails.studFee,
                    estimatedLitterSize: r.breedingDetails.estimatedLitterSize
                }
                : null,

            monitoring: r.monitoring
                ? {
                    pregnancyStatus: r.monitoring.pregnancyStatus,
                    confirmedAt: r.monitoring.confirmedAt || null,
                    expectedDueDate: r.monitoring.expectedDueDate || null,
                    deliveredAt: r.monitoring.deliveredAt || null,
                    // Only the schedule matters to the owner, not who ticked it off.
                    schedule: (r.monitoring.schedule || []).map(s => ({
                        key: s.key, label: s.label, dueDate: s.dueDate, status: s.status
                    }))
                }
                : null,

            offspring: Array.isArray(r.offspring) ? r.offspring : []
        };
    }).sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));

    return { success: true, proposals, total: proposals.length };
};
