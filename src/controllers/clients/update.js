const updateClientModel = require('../../models/clients/update');

const updateClientController = async (req, res) => {

    const modelResponse = await updateClientModel(req.body);

    try {
        if (modelResponse) {
            return res.send('Client update successfully!')
        } else {
            return res.send("Failed to update Client!")
        }
    } catch (error) {
        throw error;
    }

}

module.exports = updateClientController;