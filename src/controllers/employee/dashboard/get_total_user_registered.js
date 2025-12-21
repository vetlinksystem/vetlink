const getTotalUserRegisteredModel = require('../../../models/employee/dashboard/get_total_user_registered');

const getTotalUserRegistered = async (req, res) => {

    const modelResponse = await getTotalUserRegisteredModel();

    try {
        return res.send({ "total": modelResponse });
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalUserRegistered;