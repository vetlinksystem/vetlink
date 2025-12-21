const getAllUsersModel = require('../../../models/employee/registered_users/get_all_users');

const getAllUsers = async (req, res) => {

    const modelResponse = await getAllUsersModel(req.query);

    try {
        return res.send({ "items": modelResponse });
    } catch (error) {
        throw error;
    }
    
}

module.exports = getAllUsers;