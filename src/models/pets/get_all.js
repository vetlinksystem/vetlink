const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const getAllPet = async () => {
    try {
        const response = await firestoreManager.getAllData('pets', {});
        if (!Array.isArray(response)) return [];

        return response.map(p => {
            const breedingFlag =
                typeof p.breedingAllowed !== 'undefined'
                    ? !!p.breedingAllowed
                    : typeof p.allowBreeding !== 'undefined'
                        ? !!p.allowBreeding
                        : false;

            return {
                id: p.id,
                name: p.name,
                breed: p.breed,
                species: p.species,
                sex: p.sex,
                age: p.age,
                ownerId: p.ownerId,
                breedingAllowed: breedingFlag,
            };
        });
    } catch (error) {
        throw error;
    }
};

module.exports = getAllPet;
