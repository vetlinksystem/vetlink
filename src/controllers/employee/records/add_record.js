const addRecordModel = require('../../../models/employee/records/add_record');

const addRecordController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'employee') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Who entered the record — stamped on the document and shown on the printout.
    // req.employee / req.role are populated by requirePermission('records.manage').
    const author = {
      id: user.id,
      name: req.employee?.name || req.employee?.fullName || user.name || '',
      role: req.role || ''
    };

    const result = await addRecordModel(req.params.id, req.body || {}, req.file, author);

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
    console.error('Error adding record (employee):', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving record.',
      error: error.message,
    });
  }
};

module.exports = addRecordController;
