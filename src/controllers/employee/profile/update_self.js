const updateEmployeeSelfModel = require('../../../models/employee/profile/update_self');

const updateEmployeeSelfController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await updateEmployeeSelfModel(user.id, req.body || {});

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to update profile.'
      });
    }

    const { password, ...safe } = result.employee || {};

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      employee: safe
    });
  } catch (error) {
    console.error('Error updating employee self:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating profile.',
      error: error.message
    });
  }
};

module.exports = updateEmployeeSelfController;
