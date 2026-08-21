const saveBreedingRecordModel = require('../../models/breeding/record_details');

// PUT /breeding/record
// { id, breedingDate, matingType, place?, studFee?, numberOfMating,
//   breedingPurpose?, estimatedLitterSize?, expectedDueDate?, healthObservations?, notes? }
//
// Step 10: the clinic-side breeding record. Sire and dam come from the approved pair,
// not from a picker, so the owner-consent step cannot be bypassed.
// Veterinarian only (gated on the route).
module.exports = async function saveBreedingRecordController(req, res) {
  try {
    const employee = {
      id: req.user?.id,
      name: req.employee?.name || req.employee?.fullName || req.user?.name || ''
    };

    const result = await saveBreedingRecordModel(employee, req.body || {});

    if (!result || result.success === false) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'Unable to save the breeding record.'
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('breeding record error', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving the breeding record.',
      error: error.message
    });
  }
};
