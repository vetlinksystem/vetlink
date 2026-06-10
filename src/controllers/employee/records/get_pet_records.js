const getPetRecordsModel = require('../../../models/employee/records/get_pet_records');

const getPetRecordsController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'employee') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const result = await getPetRecordsModel(req.params.id);

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to load records.',
      });
    }

    return res.json({ success: true, records: result.records });
  } catch (error) {
    console.error('Error loading pet records (employee):', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading records.',
      error: error.message,
    });
  }
};

module.exports = getPetRecordsController;
