const updateEmployeeModel = require('../../models/employees/update');

const updateEmployeeController = async (req, res) => {
    
    const modelResponse = await updateEmployeeModel(req.body);

    try {
        if (modelResponse) {
            return res.send("Employee updated successfully!");
        } else {
            return res.send("Failed to updated Employee!");
        }
    } catch (error) {
        throw error;
    }

}

module.exports = updateEmployeeController;