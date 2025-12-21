const createAppointmentModel = require('../../models/appointments/create');

// POST /appointments
const createAppointmentController = async (req, res) => {
  try {
    const result = await createAppointmentModel(req.body || {});

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to create appointment.'
      });
    }

    return res.json({
      success: true,
      appointment: result.appointment
    });
  } catch (error) {
    console.error('appointments create error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating appointment.',
      error: error.message
    });
  }
};

module.exports = createAppointmentController;
