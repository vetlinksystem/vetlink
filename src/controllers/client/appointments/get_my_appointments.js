const getMyAppointmentsModel = require('../../../models/client/appointments/get_my_appointments');

const getMyAppointmentsController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await getMyAppointmentsModel(user.id);

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to load appointments.'
      });
    }

    return res.json({
      success: true,
      appointments: result.appointments
    });
  } catch (error) {
    console.error('Error loading client appointments:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading appointments.',
      error: error.message
    });
  }
};

module.exports = getMyAppointmentsController;
