const getAllBreedingModel = require('../../models/breeding/get_all');

const getAllBreedingController = async (req, res) => {
    try {
        const records = await getAllBreedingModel();
        return res.send(records);
    } catch (error) {
        console.error(error);
        return res.status(500).send([]);
    }
};

module.exports = getAllBreedingController;
