const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');

const updateEmployee = async (req_body) => {

    const {
        id,
        name,
        email,
        number,
        password,
        position,
        isAdmin,
    } = req_body;

    const employeeData = {
        id,
        name,
        email,
        number,
        position,
        isAdmin,
    }

    if (password) {
        employeeData.password = password;
    }

    try {
        const response = await firestoreManager.updateData('employees', employeeData);
        return response;
    } catch (error) {
        throw error;
    }
    
}

module.exports = updateEmployee;