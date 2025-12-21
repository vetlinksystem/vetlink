const firestoreManager = require('../../../fb/firestore_manager');
const utils = require('../../../utilities/utils');

const getTotalBreeds = async () => {

    try {
        const pets = await firestoreManager.getAllData('pets', {});

        const totalBreeds = {};

        pets.forEach(pet => {
            if (pet.breed) {
                totalBreeds[pet.breed] = 1;
            }
        });


        return Object.keys(totalBreeds).length;
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalBreeds;