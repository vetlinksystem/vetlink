const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');
const {
    normalizePetFields,
    validatePet,
    findDuplicate
} = require('../../utilities/petUtils');

// Clinic-side pet update. Merges over the stored record (the previous version wrote a
// whole document, blanking any field the caller omitted) and applies the same rules
// as the owner-facing form.
const updatePet = async (req_body) => {

    const body = req_body || {};
    const id = body.id;

    if (!id) {
        return { success: false, message: 'Pet id is required.' };
    }

    const existing = await firestoreManager.getData('pets', String(id));
    if (!existing) {
        return { success: false, message: 'Pet not found.' };
    }

    const ownerId = body.ownerId !== undefined ? body.ownerId : existing.ownerId;
    const fields = normalizePetFields(body, existing);

    const check = validatePet(fields);
    if (!check.ok) {
        return { success: false, message: check.message };
    }

    if (ownerId) {
        const ownerPets = await firestoreManager.getAllData('pets', { ownerId });
        const dup = findDuplicate(
            (Array.isArray(ownerPets) ? ownerPets : []).filter(p => String(p.ownerId) === String(ownerId)),
            { ...fields, ownerId },
            id
        );
        if (dup) {
            return {
                success: false,
                duplicate: true,
                existingId: dup.id,
                message: `This owner already has another pet with these details (${fields.name} — ${fields.breed}, ${fields.sex}).`
            };
        }
    }

    const petData = {
        id,
        ownerId,
        ...fields,
        allowBreeding: fields.breedingAllowed, // legacy key
        updatedAt: new Date().toISOString()
    };

    try {
        const response = await firestoreManager.updatePartialData('pets', petData);
        return { success: !!response, id, pet: petData };
    } catch (error) {
        throw error;
    }

}

module.exports = updatePet;