const getEmployeeModel = require('../../models/employees/get');

const getEmployeeController = async (req, res) => {
    
    const modelResponse = await getEmployeeModel(req.body);

    try {
        return res.send(modelResponse);
    } catch (error) {
        throw error;
    }

}

module.exports = getEmployeeController;