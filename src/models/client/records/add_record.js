const firestoreManager = require('../../../fb/firestore_manager');
const { generateRecordId } = require('../../../utilities/idGenerator');
const { uploadBuffer } = require('../../../utilities/supabase');

const pad2 = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Create a medical record for one of the client's pets, with an optional file
 * (image or PDF) stored in Supabase.
 *
 * @param {string} clientId  owner id (from token)
 * @param {Object} body      { petId, type, date, notes }
 * @param {Object} [file]    optional multer file { buffer, originalname, mimetype }
 */
const addRecord = async (clientId, body, file) => {
  if (!clientId) return { success: false, message: 'Missing client id.' };

  const petId = (body?.petId || '').trim();
  if (!petId) return { success: false, message: 'Please select a pet.' };

  // Verify the pet belongs to this client.
  const pet = await firestoreManager.getData('pets', petId);
  if (!pet) return { success: false, message: 'Pet not found.' };
  if (pet.ownerId !== clientId) return { success: false, message: 'Not authorized for this pet.' };

  const type = (body?.type || '').trim() || 'Record';
  const date = (body?.date || '').trim() || today();
  const notes = (body?.notes || '').trim();

  // Optional file upload.
  let url = null;
  if (file && file.buffer) {
    const up = await uploadBuffer('records', file.buffer, {
      originalName: file.originalname,
      mimetype: file.mimetype,
      keyHint: petId,
    });
    if (!up.success) return { success: false, message: up.message };
    url = up.url;
  }

  const id = await generateRecordId();

  const record = {
    id,
    ownerId: clientId,
    petId,
    petName: pet.name || pet.petName || 'Pet',
    type,
    date,
    notes,
    url,
    createdAt: new Date().toISOString(),
  };

  const ok = await firestoreManager.addData('records', record);
  if (!ok) return { success: false, message: 'Failed to save record.' };

  return { success: true, record, id };
};

module.exports = addRecord;
