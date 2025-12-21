const getEmployeeSelfModel = require('../../../models/employee/profile/get_self');

const getEmployeeSelfController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await getEmployeeSelfModel(user.id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || 'Employee not found.'
      });
    }

    return res.json({
      success: true,
      employee: result.employee
    });
  } catch (error) {
    console.error('Error getting employee self:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading profile.',
      error: error.message
    });
  }
};

module.exports = getEmployeeSelfController;
