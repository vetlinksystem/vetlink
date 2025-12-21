const updateAppointmentPartialModel = require('../../models/appointments/update_partial');

// PUT /appointments/:id
const updateAppointmentPartialController = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing appointment id.' });
    }

    const result = await updateAppointmentPartialModel(id, req.body || {});
    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to update appointment.'
      });
    }

    return res.json({ success: true, appointment: result.appointment || null });
  } catch (error) {
    console.error('appointments update_partial error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating appointment.',
      error: error.message
    });
  }
};

module.exports = updateAppointmentPartialController;
