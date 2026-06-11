// src/models/client/breeding/candidates.js
// Pets the logged-in client can propose breeding with, for one of their pets:
// same species, opposite sex, breeding allowed, different owner, not already matched.
const firestoreManager = require('../../../fb/firestore_manager');
const {
    getPet, publicPet, publicOwner, isBreedingAllowed,
    getAllBreedingRecords, getMatchedPetMap, findOpenProposalBetween
} = require('../../breeding/service');

const OPPOSITE = { male: 'female', female: 'male' };

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
        String(p.species || '').toLowerCase() === String(myPet.species || '').toLowerCase() &&
        String(p.sex || '').toLowerCase() === OPPOSITE[mySex] &&
        isBreedingAllowed(p) &&
        !matched[String(p.id)]
    );

    // Owner names (one fetch, joined in memory)
    const clients = await firestoreManager.getAllData('clients', {});
    const ownerById = {};
    (clients || []).forEach(c => { ownerById[String(c.id)] = c; });

    const candidates = candidatePets.map(p => {
        const open = findOpenProposalBetween(records, myPet.id, p.id);
        return {
            pet: publicPet(p),
            owner: publicOwner(ownerById[String(p.ownerId)]) || { id: p.ownerId, name: 'Pet owner' },
            proposal: open ? {
                id: open.id,
                status: open.status,
                direction: String(open.ownerAId) === String(clientId) ? 'outgoing' : 'incoming'
            } : null
        };
    });

    return {
        success: true,
        myPet: publicPet(myPet),
        candidates,
        total: candidates.length
    };
};
