const getClientModel = require('../../models/employees/get');

const getClientController = async (req, res) => {
    
    const modelResponse = await getClientModel(req.body);

    try {
        return res.send(modelResponse);
    } catch (error) {
        throw error;
    }

}

module.exports = getClientController;