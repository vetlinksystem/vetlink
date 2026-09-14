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
        // Passwords are stored in plain text; they must not reach the browser.
        // The edit form treats a blank password box as "leave it unchanged".
        return (response || []).map(({ password, ...employee }) => employee);
    } catch (error) {
        throw error;
    }

}

module.exports = getAllEmployee;