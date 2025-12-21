const deleteEmployeeModel = require('../../models/employees/delete');

const deleteEmployeeController = async(req, res) => {

    const modelResponse = await deleteEmployeeModel(req.body);

    try {
        if (modelResponse) {
            return res.send("Employee deleted successfully!");  
        } else {
            return res.send("Failed to delete Employee!");
        }  
    } catch (error) {
        throw error;
    }

}

module.exports = deleteEmployeeController;