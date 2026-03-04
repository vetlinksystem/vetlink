// DELETE /employee/users/delete?id=<clientId>
const deleteClientModel = require('../../../models/clients/delete');

module.exports = async function deleteUser(req, res) {
  try {
    const id = req.query?.id || req.body?.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'id is required.' });
    }

    const result = await deleteClientModel({ id: String(id) });
    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Failed to delete user.'
      });
    }

    return res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('employee users delete error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting user.',
      error: error.message
    });
  }
};
