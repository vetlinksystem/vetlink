const updateStatusModel = require('../../../models/breeding/update_status');

/**
 * Client responds to a breeding proposal.
 * Body: { id: 'b1001', decision: 'accept'|'decline' } ('approve'/'reject' also accepted)
 * Uses req.user.id as ownerId.
 *
 * Client-proposed records go through the new flow (accept → "accepted",
 * waiting for clinic approval); legacy clinic-proposed records keep the old
 * dual-approval behavior. Notifications are created inside the models.
 */
const respondBreedingController = async (req, res) => {
  try {
    const ownerId = req.user?.id;
    const { id, decision } = req.body || {};

    const result = await updateStatusModel({ id, ownerId, decision });
    if (!result || result.success === false) {
      return res.status(400).json(result || { success: false, message: 'Failed to update breeding status' });
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error while responding to breeding request.' });
  }
};

module.exports = respondBreedingController;
