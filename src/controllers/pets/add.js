const addPetModel = require('../../models/pets/add');

const addPetController = async ( req, res) => {

    const modelResponse = await addPetModel(req.body);

    try {
        if (modelResponse) {
            return res.send({
                success: true,
                message: 'Pet added seccesfully!'
            });
        } else {
            return res.send({
                success: false,
                message: 'Failed to add Pet!}'
            })
        }
    } catch (error) {
        throw error;
    }

}

module.exports = addPetController;