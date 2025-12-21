const firestoreManager = require('../../../fb/firestore_manager');
const { generatePetId } = require('../../../utilities/idGenerator');

/**
 * Create a pet owned by a specific client.
 *
 * Front-end expects fields:
 * {id,name,breed,species,sex,age,breedingAllowed}
 */
const addClientPet = async (clientId, reqBody) => {
  if (!clientId) {
    return { success: false, message: 'Missing client id.' };
  }

  const name = (reqBody?.name || '').trim();
  if (!name) {
    return { success: false, message: 'Pet name is required.' };
  }

  const id = await generatePetId();

  const petData = {
    id,
    ownerId: clientId,
    name,
    species: (reqBody?.species || '').trim() || 'Dog',
    breed: (reqBody?.breed || '').trim(),
    sex: (reqBody?.sex || '').trim(),
    age: typeof reqBody?.age === 'number' ? reqBody.age : (reqBody?.age ? Number(reqBody.age) : null),
    breedingAllowed: !!reqBody?.breedingAllowed,
    notes: (reqBody?.notes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  // Normalize age
  if (Number.isNaN(petData.age)) petData.age = null;
  if (typeof petData.age === 'number' && petData.age < 0) petData.age = 0;

  try {
    const ok = await firestoreManager.addData('pets', petData);
    if (!ok) {
      return { success: false, message: 'Failed to save pet.' };
    }

    return { success: true, pet: petData, id };
  } catch (error) {
    throw error;
  }
};

module.exports = addClientPet;
