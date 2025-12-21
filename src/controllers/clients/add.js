const addClientModel = require('../../models/clients/add');

const addClientsController = async (req, res) => {

    const modelResponse = await addClientModel(req.body);

    try {
        if (modelResponse) {
            return res.send("Clients added successfully!");
        } else {
            return res.send("Failed to add Clients!");
        }
    } catch (error) {
        throw error;
    }

}

module.exports = addClientsController;