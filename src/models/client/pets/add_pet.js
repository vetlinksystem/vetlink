const firestoreManager = require('../../../fb/firestore_manager');
const { generatePetId } = require('../../../utilities/idGenerator');
const {
  normalizePetFields,
  validatePet,
  findDuplicate,
  checkBreedingAge
} = require('../../../utilities/petUtils');

/**
 * Create a pet owned by a specific client.
 *
 * Fields: {id,name,breed,sex,size,weight,ageMonths,description,breedingAllowed,breedingType}
 * `species` is derived from the breed rather than asked for — see utilities/breedCatalog.js.
 * Sex and description are required, and an identical pet cannot be registered twice.
 */
const addClientPet = async (clientId, reqBody) => {
  if (!clientId) {
    return { success: false, message: 'Missing client id.' };
  }

  const fields = normalizePetFields(reqBody || {});

  const check = validatePet(fields);
  if (!check.ok) {
    return { success: false, message: check.message };
  }

  // Reject duplicate registrations (same owner, name, breed and sex).
  const ownerPets = await firestoreManager.getAllData('pets', { ownerId: clientId });
  const dup = findDuplicate(
    (Array.isArray(ownerPets) ? ownerPets : []).filter(p => String(p.ownerId) === String(clientId)),
    { ...fields, ownerId: clientId }
  );
  if (dup) {
    return {
      success: false,
      duplicate: true,
      existingId: dup.id,
      message: `You have already registered a pet with these details (${fields.name} — ${fields.breed}, ${fields.sex}). Open that pet instead of adding it again.`
    };
  }

  const id = await generatePetId();

  const petData = {
    id,
    ownerId: clientId,
    ...fields,
    createdAt: new Date().toISOString()
  };

  try {
    const ok = await firestoreManager.addData('pets', petData);
    if (!ok) {
      return { success: false, message: 'Failed to save pet.' };
    }

    // A pet past its ideal breeding window is still allowed, but the owner is told
    // the clinic will want to review the pairing.
    const ageNote = petData.breedingAllowed ? checkBreedingAge(petData) : null;

    return {
      success: true,
      pet: petData,
      id,
      breedingAgeNotice: ageNote && ageNote.status === 'past_prime' ? ageNote.message : null
    };
  } catch (error) {
    throw error;
  }
};

module.exports = addClientPet;