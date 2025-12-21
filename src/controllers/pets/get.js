const getPetModel = require('../../models/pets/get');

const getPetController = async (req, res) => {
    
    const modelResponse = await getPetModel(req.body);

    try {
        return res.send(modelResponse);
    } catch (error) {
        throw error;
    }

}

module.exports = getPetController;