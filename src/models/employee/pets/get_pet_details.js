const firestoreManager = require('../../../fb/firestore_manager');

// Returns a single pet and (optionally) its owner
const getPetDetails = async (petId) => {
  try {
    const pet = await firestoreManager.getData('pets', petId);
    if (!pet) {
      return { success: false, message: 'Pet not found.' };
    }

    let owner = null;
    if (pet.ownerId) {
      owner = await firestoreManager.getData('clients', String(pet.ownerId));
      if (owner) {
        try { delete owner.password; } catch (_) {}
      }
    }

    return { success: true, pet, owner };
  } catch (error) {
    throw error;
  }
};

module.exports = getPetDetails;
