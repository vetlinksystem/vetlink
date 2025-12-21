const firestoreManager = require('../../../fb/firestore_manager');
const utils = require('../../../utilities/utils');

const getAllUsers = async (req_params) => {

    const {
        include,
        limit,
        offset
    } = req_params;

    try {
        const allUsers = [];

        const users = await firestoreManager.getAllData('clients', {});

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            delete user.password;

            const pets = include == 'pets' ? await firestoreManager.getAllData('pets', { ownerId: user.id }, limit, offset) : 'Pets not included';

            allUsers.push({
                ...user,
                pets
            });
        }
        
        return allUsers;
    } catch (error) {
        throw error;
    }
    
}

module.exports = getAllUsers;