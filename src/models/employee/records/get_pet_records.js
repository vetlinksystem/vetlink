const firestoreManager = require('../../../fb/firestore_manager');

const pad2 = (n) => String(n).padStart(2, '0');

const normalizeDate = (dateLike) => {
  if (!dateLike) return null;
  if (typeof dateLike === 'object' && typeof dateLike.toDate === 'function') {
    const d = dateLike.toDate();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  if (typeof dateLike === 'string') {
    return dateLike.includes('T') ? dateLike.split('T')[0] : dateLike;
  }
  return null;
};

/**
 * Shape a stored record for display / printing.
 * `details` carries the type-specific block (see utilities/recordDetails.js); records
 * created before typed records existed simply have none.
 */
const publicRecord = (r) => ({
  id: r.id,
  petId: r.petId || null,
  petName: r.petName || 'Pet',
  ownerId: r.ownerId || null,
  recordType: r.recordType || '',
  type: r.type || r.recordType || 'Record',
  date: normalizeDate(r.date || r.dateTime || r.createdAt),
  veterinarian: r.veterinarian || r.createdByName || '',
  details: r.details || null,
  notes: r.notes || '',
  url: r.url || r.fileUrl || null,
  createdByName: r.createdByName || '',
  createdByRole: r.createdByRole || '',
  createdAt: r.createdAt || null
});

const byDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));

/**
 * All medical records for a single pet (employee scope).
 *
 * @param {string} petId
 */
const getPetRecords = async (petId) => {
  if (!petId) return { success: false, message: 'Missing pet id.' };

  const raw = await firestoreManager.getAllData('records', { petId });
  // getAllData matches loosely (substring), so re-check the id exactly.
  const records = (Array.isArray(raw) ? raw : [])
    .filter(r => String(r.petId) === String(petId))
    .map(publicRecord)
    .sort(byDateDesc);

  return { success: true, records };
};

module.exports = getPetRecords;
module.exports.publicRecord = publicRecord;
module.exports.byDateDesc = byDateDesc;
module.exports.normalizeDate = normalizeDate;
