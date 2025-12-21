const getUserDetailsModel = require('../../../models/employee/registered_users/get_user_details');

// GET /employee/users/get?id=<clientId>
const getUserDetails = async (req, res) => {
  try {
    const id = (req.query && req.query.id) ? String(req.query.id) : '';

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Missing user id.'
      });
    }

    const result = await getUserDetailsModel(id);
    if (!result || result.success === false) {
      return res.status(404).json({
        success: false,
        message: result?.message || 'User not found.'
      });
    }

    return res.json({
      success: true,
      user: result.user,
      pets: result.pets
    });
  } catch (error) {
    console.error('employee get_user_details error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading user details.',
      error: error.message
    });
  }
};

module.exports = getUserDetails;
