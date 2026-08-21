const firestoreManager = require('../../../fb/firestore_manager');
const {
  normalizePetFields,
  validatePet,
  findDuplicate,
  checkBreedingAge
} = require('../../../utilities/petUtils');

// PUT /client/pets/:id
// Only the owning client can update their pet.
// Fields are normalized the same way as on create: species is derived from the breed,
// sex and description are required, and the pet cannot be edited into a duplicate.
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

    // Merge the submitted fields over what's stored, then validate the result.
    const fields = normalizePetFields(req.body || {}, existing);

    const check = validatePet(fields);
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.message });
    }

    // Editing a pet must not collide with another pet the same owner already has.
    const ownerPets = await firestoreManager.getAllData('pets', { ownerId: clientId });
    const dup = findDuplicate(
      (Array.isArray(ownerPets) ? ownerPets : []).filter(p => String(p.ownerId) === String(clientId)),
      { ...fields, ownerId: clientId },
      id
    );
    if (dup) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        existingId: dup.id,
        message: `Another one of your pets already has these details (${fields.name} — ${fields.breed}, ${fields.sex}).`
      });
    }

    const patch = {
      id,
      ...fields,
      updatedAt: new Date().toISOString()
    };

    const ok = await firestoreManager.updatePartialData('pets', patch);
    if (!ok) {
      return res.status(500).json({ success: false, message: 'Failed to update pet.' });
    }

    const updated = await firestoreManager.getData('pets', id);

    const ageNote = patch.breedingAllowed ? checkBreedingAge(patch) : null;

    return res.json({
      success: true,
      pet: updated,
      breedingAgeNotice: ageNote && ageNote.status === 'past_prime' ? ageNote.message : null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error while updating pet.', error: err.message });
  }
};