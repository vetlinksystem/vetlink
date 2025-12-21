const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');
const { generateEmployeeId } = require('../../utilities/idGenerator');

const addEmployee = async (req_body) => {
    const {
        name,
        email,
        number,
        password,
        position,
        isAdmin
    } = req_body;

    // Use sequential, human-friendly IDs (e1001, e1002, ...)
    const id = await generateEmployeeId();

    const employeeData = {
        id,
        name,
        email,
        number,
        password,
        position,
        isAdmin: utils.toBoolean(isAdmin)
    };

    try {
        const response = await firestoreManager.addData('employees', employeeData);
        return {
            success: !!response,
            id,
            employee: employeeData
        };
    } catch (error) {
        throw error;
    }
};

module.exports = addEmployee;