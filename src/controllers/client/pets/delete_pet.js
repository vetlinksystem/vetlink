const firestoreManager = require('../../../fb/firestore_manager');

// DELETE /client/pets/:id
// Only the owning client can delete their pet.
module.exports = async (req, res) => {
  try {
    const clientId = req.user?.id;
    const id = req.params.id;
    if (!clientId || !id) {
      return res.status(400).json({ success: false, message: 'Missing client or pet id.' });
    }

    const existing = await firestoreManager.getData('pets', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pet not found.' });
    }
    if (String(existing.ownerId) !== String(clientId)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to delete this pet.' });
    }

    const ok = await firestoreManager.deleteData('pets', id);
    if (!ok) {
      return res.status(500).json({ success: false, message: 'Failed to delete pet.' });
    }

    return res.json({ success: true, message: 'Pet deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error while deleting pet.', error: err.message });
  }
};
