const firestoreManager = require('../../../fb/firestore_manager');
const { generateRecordId } = require('../../../utilities/idGenerator');
const { uploadBuffer } = require('../../../utilities/supabase');

const pad2 = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Create a medical record for any pet (employee scope), with an optional file.
 * The record is tagged with the pet's ownerId so the client sees it too.
 *
 * @param {string} petId
 * @param {Object} body   { type, date, notes }
 * @param {Object} [file] multer file { buffer, originalname, mimetype }
 */
const addRecord = async (petId, body, file) => {
  if (!petId) return { success: false, message: 'Missing pet id.' };

  const pet = await firestoreManager.getData('pets', petId);
  if (!pet) return { success: false, message: 'Pet not found.' };

  const type = (body?.type || '').trim() || 'Record';
  const date = (body?.date || '').trim() || today();
  const notes = (body?.notes || '').trim();

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
    ownerId: pet.ownerId || null, // so the owning client can see it
    petId,
    petName: pet.name || pet.petName || 'Pet',
    type,
    date,
    notes,
    url,
    createdBy: 'employee',
    createdAt: new Date().toISOString(),
  };

  const ok = await firestoreManager.addData('records', record);
  if (!ok) return { success: false, message: 'Failed to save record.' };

  return { success: true, record, id };
};

module.exports = addRecord;
