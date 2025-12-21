const getClientDashboardOverviewModel = require('../../../models/client/dashboard/get_overview');

const getClientDashboardOverviewController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await getClientDashboardOverviewModel(user.id);

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to load dashboard data.'
      });
    }

    return res.json({
      success: true,
      appointments: result.appointments,
      pets: result.pets,
      records: result.records,
      petsTotal: result.petsTotal
    });
  } catch (error) {
    console.error('Error loading client dashboard overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading dashboard.',
      error: error.message
    });
  }
};

module.exports = getClientDashboardOverviewController;
