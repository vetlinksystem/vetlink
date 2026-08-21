const getAllRecordsModel = require('../../../models/employee/records/get_all_records');

// GET /employee/records/all?petId=&ownerId=&recordType=&from=&to=&q=&limit=
// Clinic-wide medical records for the records page (view + print).
const getAllRecordsController = async (req, res) => {
  try {
    const result = await getAllRecordsModel(req.query || {});

    return res.json({
      success: true,
      records: result.records,
      total: result.total
    });
  } catch (error) {
    console.error('Error loading all records (employee):', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading records.',
      error: error.message
    });
  }
};

module.exports = getAllRecordsController;
