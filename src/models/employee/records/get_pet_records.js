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
 * All medical records for a single pet (employee scope).
 *
 * @param {string} petId
 */
const getPetRecords = async (petId) => {
  if (!petId) return { success: false, message: 'Missing pet id.' };

  const raw = await firestoreManager.getAllData('records', { petId });
  const records = (Array.isArray(raw) ? raw : []).map(r => ({
    id: r.id,
    petId: r.petId || null,
    petName: r.petName || 'Pet',
    type: r.type || r.recordType || 'Record',
    date: normalizeDate(r.date || r.dateTime || r.createdAt),
    notes: r.notes || '',
    url: r.url || r.fileUrl || null,
  }));

  // Newest first.
  records.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  return { success: true, records };
};

module.exports = getPetRecords;
