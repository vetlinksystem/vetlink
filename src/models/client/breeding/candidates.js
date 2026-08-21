// src/models/client/breeding/candidates.js
// Pets the logged-in client can propose breeding with, for one of their pets:
// same species, opposite sex, breeding allowed, different owner, not already matched.
//
// This used to return a flat, unranked list. The crossbreeding document asks for
// suggested matches to be *ranked*, each showing a compatibility score, an estimated
// health risk (Low / Moderate / High) and a veterinary recommendation — so every
// candidate is now scored by models/breeding/compatibility.js and sorted best-first.
const firestoreManager = require('../../../fb/firestore_manager');
const {
    getPet, publicPet, publicOwner, isBreedingAllowed,
    getAllBreedingRecords, getMatchedPetMap, findOpenProposalBetween
} = require('../../breeding/service');
const { assessPair, buildHealthInfo } = require('../../breeding/compatibility');
const { checkBreedingAge } = require('../../../utilities/petUtils');
const { DEFAULT_SPECIES } = require('../../../utilities/breedCatalog');

const OPPOSITE = { male: 'female', female: 'male' };

// The clinic is dogs only, so a pet saved before `species` was derived (or one whose
// breed was free text) is a dog. Without this, those pets silently matched nobody.
const effectiveSpecies = (pet) =>
    String(pet?.species || DEFAULT_SPECIES).trim().toLowerCase();

module.exports = async function getBreedingCandidates(clientId, petId) {
    const myPet = await getPet(petId);
    if (!myPet) {
        return { success: false, message: 'Pet not found.' };
    }
    if (String(myPet.ownerId) !== String(clientId)) {
        return { success: false, message: 'You can only find matches for your own pets.' };
    }
    if (!isBreedingAllowed(myPet)) {
        return { success: false, message: 'This pet is not marked as available for breeding. Enable breeding on the pet first.' };
    }
    const mySex = String(myPet.sex || '').toLowerCase();
    if (!OPPOSITE[mySex]) {
        return { success: false, message: 'Set this pet\'s sex (Male/Female) before finding a breeding match.' };
    }

    // Breeding an underage animal is never appropriate — block before searching.
    const myAge = checkBreedingAge(myPet);
    if (myAge.status === 'too_young') {
        return { success: false, message: myAge.message };
    }

    const records = await getAllBreedingRecords();
    const matched = getMatchedPetMap(records);

    if (matched[String(myPet.id)]) {
        return {
            success: false,
            message: `${myPet.name || 'This pet'} already has a breeding match in progress.`,
            matchedBreedingId: matched[String(myPet.id)].id
        };
    }

    const allPets = await firestoreManager.getAllData('pets', {});
    const candidatePets = (allPets || []).filter(p =>
        String(p.id) !== String(myPet.id) &&
        p.ownerId && String(p.ownerId) !== String(clientId) &&
        effectiveSpecies(p) === effectiveSpecies(myPet) &&
        String(p.sex || '').toLowerCase() === OPPOSITE[mySex] &&
        isBreedingAllowed(p) &&
        !matched[String(p.id)]
    );

    // Owner names (one fetch, joined in memory)
    const clients = await firestoreManager.getAllData('clients', {});
    const ownerById = {};
    (clients || []).forEach(c => { ownerById[String(c.id)] = c; });

    // Health clearance is derived from the records collection (one fetch for all pets).
    const allRecords = await firestoreManager.getAllData('records', {});
    const healthInfo = buildHealthInfo(
        allRecords,
        [myPet.id, ...candidatePets.map(p => p.id)]
    );

    // The owner's crossbreeding preference (preferred mate size) only affects ranking,
    // never whether a candidate is shown.
    const preferredSize = String(myPet.preferredSize || '').toLowerCase();

    const candidates = candidatePets
        .map(p => {
            const assessment = assessPair(myPet, p, healthInfo);
            const open = findOpenProposalBetween(records, myPet.id, p.id);

            const matchesPreference = !!preferredSize &&
                String(p.size || '').toLowerCase() === preferredSize;

            return {
                pet: publicPet(p),
                owner: publicOwner(ownerById[String(p.ownerId)]) || { id: p.ownerId, name: 'Pet owner' },
                // Guidance for the owner; the clinic still has the final say.
                compatibility: {
                    score: assessment.score,
                    risk: assessment.risk,
                    breedStatus: assessment.breedStatus,
                    requiresVetReview: assessment.requiresVetReview,
                    recommendation: assessment.recommendation,
                    flags: assessment.flags,
                    breakdown: assessment.breakdown,
                    eligible: assessment.eligible,
                    ineligibleReason: assessment.reason
                },
                matchesPreference,
                proposal: open ? {
                    id: open.id,
                    status: open.status,
                    direction: String(open.ownerAId) === String(clientId) ? 'outgoing' : 'incoming'
                } : null
            };
        })
        // Pairs the compatibility table forbids outright are not offered at all.
        .filter(c => c.compatibility.eligible)
        // Best match first; a size-preference match breaks ties.
        .sort((a, b) =>
            (b.compatibility.score - a.compatibility.score) ||
            (Number(b.matchesPreference) - Number(a.matchesPreference)) ||
            String(a.pet.name || '').localeCompare(String(b.pet.name || ''))
        );

    return {
        success: true,
        myPet: publicPet(myPet),
        // Surfaced so the UI can warn the owner before they propose.
        myPetBreedingAge: {
            status: myAge.status,
            message: myAge.status === 'ideal' ? null : myAge.message
        },
        breedingType: myPet.breedingType || '',
        breedingPurpose: myPet.breedingPurpose || '',
        preferredSize: myPet.preferredSize || '',
        candidates,
        total: candidates.length
    };
};
