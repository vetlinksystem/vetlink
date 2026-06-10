const addRecordModel = require('../../../models/client/records/add_record');

const addRecordController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const result = await addRecordModel(user.id, req.body || {}, req.file);

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to save record.',
      });
    }

    return res.status(201).json({
      success: true,
      id: result.id,
      record: result.record,
    });
  } catch (error) {
    console.error('Error adding record:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving record.',
      error: error.message,
    });
  }
};

module.exports = addRecordController;
