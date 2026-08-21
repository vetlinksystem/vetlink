const getScheduleRangeModel = require('../../../models/employee/schedule/get_range');

const getScheduleRangeController = async (req, res) => {
  try {
    const { from, to, includePending, includeCancelled } = req.query;

    // The calendar shows confirmed visits only. These flags let the UI opt pending
    // requests / cancelled appointments back in behind a toggle.
    const truthy = (v) => v === true || v === 'true' || v === '1';

    const items = await getScheduleRangeModel({
      from,
      to,
      includePending: truthy(includePending),
      includeCancelled: truthy(includeCancelled)
    });

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
