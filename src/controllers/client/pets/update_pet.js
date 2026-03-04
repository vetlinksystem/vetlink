const firestoreManager = require('../../../fb/firestore_manager');

// PUT /client/pets/:id
// Only the owning client can update their pet.
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
      return res.status(403).json({ success: false, message: 'You are not allowed to update this pet.' });
    }

    const {
      name,
      species,
      breed,
      sex,
      age,
      breedingAllowed,
      notes,
    } = req.body || {};

    const patch = {
      id,
      updatedAt: new Date().toISOString(),
    };

    if (typeof name === 'string') patch.name = name.trim();
    if (typeof species === 'string') patch.species = species.trim();
    if (typeof breed === 'string') patch.breed = breed.trim();
    if (typeof sex === 'string') patch.sex = sex.trim();
    if (typeof age !== 'undefined') patch.age = age;
    if (typeof breedingAllowed !== 'undefined') patch.breedingAllowed = !!breedingAllowed;
    if (typeof notes === 'string') patch.notes = notes;

    const ok = await firestoreManager.updatePartialData('pets', patch);
    if (!ok) {
      return res.status(500).json({ success: false, message: 'Failed to update pet.' });
    }

    const updated = await firestoreManager.getData('pets', id);
    return res.json({ success: true, pet: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error while updating pet.', error: err.message });
  }
};
