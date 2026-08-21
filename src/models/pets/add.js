const firestoreManager = require('../../fb/firestore_manager');
const utils = require ('../../utilities/utils');
const { generatePetId } = require('../../utilities/idGenerator');
const {
    normalizePetFields,
    validatePet,
    findDuplicate
} = require('../../utilities/petUtils');

// Clinic-side pet creation. Uses the same normalization and duplicate guard as the
// owner-facing form so records stay consistent whoever entered them.
const addPet = async (req_body) => {

    const body = req_body || {};
    const ownerId = body.ownerId;

    const fields = normalizePetFields(body);

    const check = validatePet(fields);
    if (!check.ok) {
        return { success: false, message: check.message };
    }

    if (ownerId) {
        const ownerPets = await firestoreManager.getAllData('pets', { ownerId });
        const dup = findDuplicate(
            (Array.isArray(ownerPets) ? ownerPets : []).filter(p => String(p.ownerId) === String(ownerId)),
            { ...fields, ownerId }
        );
        if (dup) {
            return {
                success: false,
                duplicate: true,
                existingId: dup.id,
                message: `This owner already has a pet with these details (${fields.name} — ${fields.breed}, ${fields.sex}).`
            };
        }
    }

    const id = await generatePetId();

    const petData = {
        id,
        ownerId,
        ...fields,
        // Keep the legacy key too (older UI used allowBreeding)
        allowBreeding: fields.breedingAllowed,
        createdAt: new Date().toISOString()
    };

    try {
        const response = await firestoreManager.addData('pets', petData);
        return {
            success: !!response,
            id,
            pet: petData
        };
    } catch (error) {
        throw error;
    }

};

module.exports = addPet;