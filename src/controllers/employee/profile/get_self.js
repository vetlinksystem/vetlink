const getEmployeeSelfModel = require('../../../models/employee/profile/get_self');
const { resolveRole, permissionsFor, ROLE_LABELS } = require('../../../utilities/roles');

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

    // The front-end uses role + permissions to hide the controls this user is not
    // allowed to use (e.g. breeding decision buttons for admin/staff). The server
    // still enforces every one of these on the API side.
    const role = resolveRole(result.employee);

    return res.json({
      success: true,
      employee: result.employee,
      role,
      roleLabel: ROLE_LABELS[role] || role,
      permissions: permissionsFor(role)
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
