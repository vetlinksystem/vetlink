const getAllClientModel = require('../../models/clients/get_all');

const getAllClientController = async (req, res) => {

    const modelResponse = await getAllClientModel(req.body);

    try {
        return res.send(modelResponse);
    } catch (error) {
        throw error;
    }

}

module.exports = getAllClientController;