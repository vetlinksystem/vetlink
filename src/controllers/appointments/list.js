const listAppointmentsModel = require('../../models/appointments/list');

// GET /appointments?limit=100&offset=0
const listAppointmentsController = async (req, res) => {
  try {
    const limit = Number(req.query?.limit || 0) || 0;
    const offset = Number(req.query?.offset || 0) || 0;

    const items = await listAppointmentsModel({ limit, offset });

    return res.json(items);
  } catch (error) {
    console.error('appointments list error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while listing appointments.',
      error: error.message
    });
  }
};

module.exports = listAppointmentsController;
