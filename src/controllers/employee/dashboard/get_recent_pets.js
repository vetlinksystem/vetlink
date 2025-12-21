const getRecentPetsModel = require('../../../models/employee/dashboard/get_recent_pets');

const getRecentPets = async (req, res) => {

    const modelResponse = await getRecentPetsModel(req.query);

    try {
        return res.send({ "items": modelResponse });
    } catch (error) {
        throw error;
    }

}

module.exports = getRecentPets;