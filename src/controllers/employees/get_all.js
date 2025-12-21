const getAllEmployeeModel = require('../../models/employees/get_all');

const getAllEmployeeController = async(req, res) => {

    const modelResponse = await getAllEmployeeModel(req.body);

    try {
        return res.send(modelResponse);
    } catch (error) {
        throw error;
    }

}

module.exports = getAllEmployeeController;