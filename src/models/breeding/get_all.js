const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const getAllBreeding = async () => {
    try {
        const response = await firestoreManager.getAllData('breeding', {});
        return response;
    } catch (error) {
        throw error;
    }
}

module.exports = getAllBreeding;