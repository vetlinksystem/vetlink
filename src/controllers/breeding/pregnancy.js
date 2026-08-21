const {
  updatePregnancy,
  recordOffspring,
  dueCheckups,
  sendCheckupReminders
} = require('../../models/breeding/pregnancy');

const employeeFrom = (req) => ({
  id: req.user?.id,
  name: req.employee?.name || req.employee?.fullName || req.user?.name || ''
});

const fail = (res, result, fallback) =>
  res.status(400).json({ success: false, message: result?.message || fallback });

// PUT /breeding/pregnancy — update status or tick off a monitoring check-up
const updateController = async (req, res) => {
  try {
    const result = await updatePregnancy(employeeFrom(req), req.body || {});
    if (!result || result.success === false) return fail(res, result, 'Unable to update monitoring.');
    return res.json(result);
  } catch (error) {
    console.error('pregnancy update error', error);
    return res.status(500).json({
      success: false, message: 'Server error while updating monitoring.', error: error.message
    });
  }
};

// PUT /breeding/offspring — record the litter
const offspringController = async (req, res) => {
  try {
    const result = await recordOffspring(employeeFrom(req), req.body || {});
    if (!result || result.success === false) return fail(res, result, 'Unable to save offspring records.');
    return res.json(result);
  } catch (error) {
    console.error('offspring record error', error);
    return res.status(500).json({
      success: false, message: 'Server error while saving offspring records.', error: error.message
    });
  }
};

// GET /breeding/checkups-due?withinDays=3 — monitoring check-ups due or overdue
const dueController = async (req, res) => {
  try {
    const withinDays = Number(req.query?.withinDays);
    const result = await dueCheckups({
      withinDays: Number.isFinite(withinDays) ? withinDays : 3
    });
    return res.json(result);
  } catch (error) {
    console.error('checkups due error', error);
    return res.status(500).json({
      success: false, message: 'Server error while loading due check-ups.', error: error.message
    });
  }
};

// POST /breeding/send-reminders — send reminders for due/overdue check-ups
// Safe to call repeatedly: a step is only reminded once per due date.
const remindersController = async (req, res) => {
  try {
    const withinDays = Number(req.body?.withinDays);
    const result = await sendCheckupReminders({
      withinDays: Number.isFinite(withinDays) ? withinDays : 3
    });
    return res.json(result);
  } catch (error) {
    console.error('send reminders error', error);
    return res.status(500).json({
      success: false, message: 'Server error while sending reminders.', error: error.message
    });
  }
};

module.exports = {
  updateController,
  offspringController,
  dueController,
  remindersController
};
