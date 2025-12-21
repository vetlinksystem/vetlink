const deletePetModel = require('../../models/pets/delete');

const deletePetController = async(req, res) => {

    const modelResponse = await  deletePetModel(req.body);

    try {
        if (modelResponse) {
            return res.send("Pet deleted successfully!")
        } else {
            return res.send("Failed to delete Pet");
        }
    } catch (error) {
        throw error
    }

}

module.exports = deletePetController;