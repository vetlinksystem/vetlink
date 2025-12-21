const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const addEmployee = async (req_body) => {

    const {
        name,
        email,
        number,
        password,
        position,
        isAdmin
    } = req_body;

    const employeeData = {
        "id": "123",
        name,
        email,
        number,
        password,
        position,
        "isAdmin": utils.toBoolean(isAdmin)
    }

    try {
        const response = await firestoreManager.addData('employees', employeeData);
        return response;
    } catch (error) {
        throw error;
    }
    
}

module.exports = addEmployee;