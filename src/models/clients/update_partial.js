const firestoreManager = require('../../fb/firestore_manager');

// Partial update for clients.
// - Does NOT overwrite password unless a non-empty password is provided.
// - Skips undefined / null fields.
const updateClientPartial = async (req_body = {}) => {
  const {
    id,
    name,
    address,
    email,
    number,
    password
  } = req_body;

  if (!id) {
    return { success: false, message: 'id is required.' };
  }

  const patch = { id: String(id) };

  if (name !== undefined) patch.name = name;
  if (address !== undefined) patch.address = address;
  if (email !== undefined) patch.email = email;
  if (number !== undefined) patch.number = number;

  // Only set password if explicitly provided and non-empty
  if (password !== undefined) {
    const pw = String(password || '').trim();
    if (pw) patch.password = pw;
  }

  try {
    const ok = await firestoreManager.updatePartialData('clients', patch);
    return ok ? { success: true } : { success: false, message: 'Update failed.' };
  } catch (error) {
    throw error;
  }
};

module.exports = updateClientPartial;
