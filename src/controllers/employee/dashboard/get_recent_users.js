const getRecentUsersModel = require('../../../models/employee/dashboard/get_recent_users');

const getRecentUsers = async (req, res) => {

    const modelResponse = await getRecentUsersModel(req.query);

    try {
        return res.send({ "items": modelResponse });
    } catch (error) {
        throw error;
    }

}

module.exports = getRecentUsers;