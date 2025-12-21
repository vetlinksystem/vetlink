const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const getAllEmployee = async (req_body) => {

    // const {
    //     name,
    //     isAdmin
    // } = req_body;

    // const employeeData = {
    //     name,
    //     "isAdmin": utils.toBoolean(isAdmin)
    // }

    try {
        const response = await firestoreManager.getAllData('employees', {});
        return response;
    } catch (error) {
        throw error;
    }

}

module.exports = getAllEmployee;