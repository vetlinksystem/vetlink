const addClientAppointmentModel = require('../../../models/client/appointments/add');

const addClientAppointmentController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await addClientAppointmentModel(user.id, req.body || {});

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
    console.error('Error creating client appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating appointment.',
      error: error.message
    });
  }
};

module.exports = addClientAppointmentController;
