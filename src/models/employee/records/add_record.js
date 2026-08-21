const firestoreManager = require('../../../fb/firestore_manager');
const { generateRecordId } = require('../../../utilities/idGenerator');
const { uploadBuffer } = require('../../../utilities/supabase');
const { normalizeRecordDetails } = require('../../../utilities/recordDetails');
const { RECORD_TYPES } = require('../../../utilities/catalogs');

const pad2 = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const labelFor = (key) => {
  const hit = RECORD_TYPES.find((t) => t.key === key);
  return hit ? hit.label : 'Record';
};

/**
 * Create a medical record for any pet, with an optional file.
 * The record is tagged with the pet's ownerId so the client sees it too.
 *
 * Records are now typed (check-up / general check-up / vaccination / grooming / surgery)
 * and carry a structured `details` block built from the clinic's controlled vocabularies
 * (see utilities/catalogs.js). Free-text notes remain available alongside it.
 *
 * Only veterinarians and administrators reach this — enforced by the route
 * (requirePermission('records.manage')). `author` records who entered it, which is
 * what the printed record shows.
 *
 * @param {string} petId
 * @param {Object} body   { recordType, date, notes, ...type-specific fields }
 * @param {Object} [file] multer file { buffer, originalname, mimetype }
 * @param {Object} [author] { id, name, role } of the employee creating the record
 */
const addRecord = async (petId, body, file, author = null) => {
  if (!petId) return { success: false, message: 'Missing pet id.' };

  const pet = await firestoreManager.getData('pets', petId);
  if (!pet) return { success: false, message: 'Pet not found.' };

  // Type + type-specific details (rejects unknown types and missing key fields).
  const parsed = normalizeRecordDetails(body || {});
  if (!parsed.ok) return { success: false, message: parsed.message };

  const date = (body?.date || '').trim() || today();
  const notes = (body?.notes || '').trim();
  const veterinarian = (body?.veterinarian || author?.name || '').trim();

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
    recordType: parsed.recordType,
    // `type` is the human label, kept because existing readers (client records page,
    // Android list, dashboards) display it directly.
    type: labelFor(parsed.recordType),
    details: parsed.details,
    veterinarian,
    date,
    notes,
    url,
    createdBy: 'employee',
    createdById: author?.id || '',
    createdByName: author?.name || '',
    createdByRole: author?.role || '',
    createdAt: new Date().toISOString(),
  };

  const ok = await firestoreManager.addData('records', record);
  if (!ok) return { success: false, message: 'Failed to save record.' };

  return { success: true, record, id };
};

module.exports = addRecord;
