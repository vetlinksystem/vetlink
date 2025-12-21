const getScheduleRangeModel = require('../../../models/employee/schedule/get_range');

const getScheduleRangeController = async (req, res) => {
  try {
    const { from, to } = req.query;

    const items = await getScheduleRangeModel({ from, to });

    return res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Error loading schedule range:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load schedule.',
      error: error.message
    });
  }
};

module.exports = getScheduleRangeController;
