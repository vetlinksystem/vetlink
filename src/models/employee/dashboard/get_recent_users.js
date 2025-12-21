const firestoreManager = require('../../../fb/firestore_manager');
const utils = require('../../../utilities/utils');

const getRecentUsers = async (req_params) => {

    const { limit } = req_params;

    try {
        const clients = await firestoreManager.getAllData('clients', {});
        clients.reverse();
        return clients.slice(0, limit);

    } catch (error) {
        throw error;
    }

}

module.exports = getRecentUsers;