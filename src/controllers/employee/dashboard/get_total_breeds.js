const getTotalBreedsModel = require('../../../models/employee/dashboard/get_total_breeds');

const getTotalBreeds = async (req, res) => {

    const modelResponse = await getTotalBreedsModel();

    try {
        return res.send({ "total": modelResponse });
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalBreeds;