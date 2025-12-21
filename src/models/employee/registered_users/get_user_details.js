const firestoreManager = require('../../../fb/firestore_manager');

// Returns a single client user and their pets
const getUserDetails = async (clientId) => {
  try {
    const user = await firestoreManager.getData('clients', clientId);
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    // Never expose password hash even if present
    try { delete user.password; } catch (_) {}

    const petsRaw = await firestoreManager.getAllData('pets', { ownerId: clientId });
    const pets = Array.isArray(petsRaw) ? petsRaw : [];

    return { success: true, user, pets };
  } catch (error) {
    throw error;
  }
};

module.exports = getUserDetails;
