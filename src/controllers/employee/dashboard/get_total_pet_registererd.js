const getTotalPetRegisteredModel = require('../../../models/employee/dashboard/get_total_pet_registered');

const getTotalPetRegistered = async (req, res) => {

    const modelResponse = await getTotalPetRegisteredModel();

    try {
        return res.send({ "total": modelResponse });
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalPetRegistered;