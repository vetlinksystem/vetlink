const updateStatusModel = require('../../../models/breeding/update_status');
const addNotification = require('../../../models/notifications/add');
const firestoreManager = require('../../../fb/firestore_manager');

/**
 * Client responds to a breeding proposal.
 * Body: { id: 'b1001', decision: 'approve'|'reject' }
 * Uses req.user.id as ownerId.
 */
const respondBreedingController = async (req, res) => {
  try {
    const ownerId = req.user?.id;
    const { id, decision } = req.body || {};

    const result = await updateStatusModel({ id, ownerId, decision });
    if (!result || result.success === false) {
      return res.status(400).json(result || { success: false, message: 'Failed to update breeding status' });
    }

    // Notify both owners about the updated state
    const list = await firestoreManager.getAllData('breeding', { id });
    const record = list && list[0];

    if (record) {
      const status = result.status || record.status || 'pending';
      const title = status === 'approved'
        ? 'Breeding request approved'
        : status === 'rejected'
          ? 'Breeding request rejected'
          : 'Breeding request updated';

      const msg = status === 'approved'
        ? 'Both owners approved the breeding request.'
        : status === 'rejected'
          ? 'A breeding request was rejected.'
          : 'One owner responded to the breeding request. Waiting for the other owner.';

      const data = { breedingId: id, type: 'breeding', status };
      await Promise.all([
        addNotification({ userId: record.ownerAId, title, message: msg, type: 'breeding', data }),
        addNotification({ userId: record.ownerBId, title, message: msg, type: 'breeding', data }),
      ]);
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error while responding to breeding request.' });
  }
};

module.exports = respondBreedingController;
