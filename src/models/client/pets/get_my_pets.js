const firestoreManager = require('../../../fb/firestore_manager');

const getMyPets = async (clientId) => {
  if (!clientId) {
    return { success: false, message: 'Missing client id.' };
  }

  try {
    const petsRaw = await firestoreManager.getAllData('pets', { ownerId: clientId });
    const pets = Array.isArray(petsRaw) ? petsRaw : [];

    const mapped = pets.map(p => {
      const breedingFlag =
        typeof p.breedingAllowed !== 'undefined'
          ? !!p.breedingAllowed
          : typeof p.allowBreeding !== 'undefined'
            ? !!p.allowBreeding
            : false;

      return {
        id: p.id,
        name: p.name || p.petName || 'Pet',
        breed: p.breed || '',
        species: p.species || '',
        sex: p.sex || '',
        age: p.age || null,
        breedingAllowed: breedingFlag
      };
    });

    return {
      success: true,
      pets: mapped,
      total: mapped.length
    };
  } catch (error) {
    throw error;
  }
};

module.exports = getMyPets;
