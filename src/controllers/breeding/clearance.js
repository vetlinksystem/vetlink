const finalClearanceModel = require('../../models/breeding/clearance');

// PUT /breeding/clearance
// { id, petAFit, petBFit, findings?, notes? }
//
// Step 9 of the breeding flow: the final pre-breeding health examination.
// Veterinarian only (gated by requirePermission('breeding.decide') on the route).
module.exports = async function finalClearanceController(req, res) {
  try {
    const employee = {
      id: req.user?.id,
      name: req.employee?.name || req.employee?.fullName || req.user?.name || ''
    };

    const result = await finalClearanceModel(employee, req.body || {});

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to record the final clearance.'
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('breeding clearance error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while recording the final clearance.',
      error: error.message
    });
  }
};
