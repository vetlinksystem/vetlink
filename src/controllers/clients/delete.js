const deleteClientModel = require('../../models/clients/delete');

const deleteClientController = async(req, res) => {

    const modelResponse = await deleteClientModel(req.body);

    try {
        if (modelResponse) {
            return res.send("Client deleted successfully!");  
        } else {
            return res.send("Failed to delete Client!");
        }  
    } catch (error) {
        throw error;
    }

}

module.exports = deleteClientController;