const getMyRecordsModel = require('../../../models/client/records/get_my_records');

const getMyRecordsController = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    const result = await getMyRecordsModel(user.id);

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to load records.'
      });
    }

    return res.json({
      success: true,
      records: result.records,
      pets: result.pets
    });
  } catch (error) {
    console.error('Error loading client records:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading records.',
      error: error.message
    });
  }
};

module.exports = getMyRecordsController;
