const { takenTimesOn, MAX_PER_DAY } = require('../../utilities/appointmentSlots');

/**
 * GET /appointments/availability?date=YYYY-MM-DD[&ignoreId=a1001]
 *
 * Which times on a day are already taken, so the booking UI can grey them out
 * instead of letting someone submit a slot the server will only then reject.
 * The server still enforces the rule on write — this is purely so the client can
 * show it up front.
 */
const availabilityController = async (req, res) => {
  try {
    const date = String(req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'A date (YYYY-MM-DD) is required.' });
    }

    const ignoreId = req.query.ignoreId ? String(req.query.ignoreId) : undefined;
    const taken = await takenTimesOn(date, ignoreId);

    return res.json({
      success: true,
      date,
      taken,
      maxPerDay: MAX_PER_DAY,
      full: taken.length >= MAX_PER_DAY
    });
  } catch (error) {
    console.error('Error reading appointment availability:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while reading availability.',
      error: error.message
    });
  }
};

module.exports = availabilityController;
