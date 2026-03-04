// PUT /employee/users/update
// Body: { id, name?, email?, number?, address?, password? }
// Notes:
// - password is optional; if blank/undefined, it will NOT overwrite existing password.

const updateClientPartialModel = require('../../../models/clients/update_partial');

module.exports = async function updateUser(req, res) {
  try {
    const body = req.body || {};

    if (!body.id) {
      return res.status(400).json({ success: false, message: 'id is required.' });
    }

    const result = await updateClientPartialModel(body);
    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Failed to update user.'
      });
    }

    return res.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    console.error('employee users update error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating user.',
      error: error.message
    });
  }
};
