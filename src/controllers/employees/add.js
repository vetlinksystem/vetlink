const addEmployeeModel = require('../../models/employees/add');

const addEmployeeController = async (req, res) => {

    const modelResponse = await addEmployeeModel(req.body);

    try {
        if (modelResponse) {
            return res.send("Employee added successfully!");
        } else {
            return res.send("Failed to add Employee!");
        }
    } catch (error) {
        throw error;
    }

}

module.exports = addEmployeeController;