const firestoreManager = require('../../../fb/firestore_manager');
const { publicRecord, byDateDesc } = require('./get_pet_records');

/**
 * Clinic-wide medical records, joined with pet and owner names so the records page can
 * be searched, filtered and printed without a request per row.
 *
 * Filters (all optional): petId, ownerId, recordType, from, to, q
 */
const getAllRecords = async (filters = {}) => {
  const { petId, ownerId, recordType, from, to, q, limit } = filters;

  const [recordsRaw, petsRaw, clientsRaw] = await Promise.all([
    firestoreManager.getAllData('records', {}),
    firestoreManager.getAllData('pets', {}),
    firestoreManager.getAllData('clients', {})
  ]);

  const petById = new Map();
  (Array.isArray(petsRaw) ? petsRaw : []).forEach(p => {
    if (p && p.id) petById.set(String(p.id), p);
  });

  const clientById = new Map();
  (Array.isArray(clientsRaw) ? clientsRaw : []).forEach(c => {
    if (c && c.id) clientById.set(String(c.id), c);
  });

  let records = (Array.isArray(recordsRaw) ? recordsRaw : []).map(r => {
    const base = publicRecord(r);
    const pet = petById.get(String(base.petId));
    const owner = clientById.get(String(base.ownerId || pet?.ownerId || ''));

    return {
      ...base,
      petName: pet?.name || base.petName,
      petBreed: pet?.breed || '',
      petSpecies: pet?.species || '',
      ownerId: base.ownerId || pet?.ownerId || null,
      ownerName: owner?.name || '',
      ownerNumber: owner?.number || ''
    };
  });

  if (petId) records = records.filter(r => String(r.petId) === String(petId));
  if (ownerId) records = records.filter(r => String(r.ownerId) === String(ownerId));
  if (recordType) records = records.filter(r => String(r.recordType) === String(recordType));
  if (from) records = records.filter(r => String(r.date || '') >= String(from));
  if (to) records = records.filter(r => String(r.date || '') <= String(to));

  if (q) {
    const needle = String(q).toLowerCase();
    records = records.filter(r =>
      [r.id, r.petName, r.ownerName, r.type, r.petBreed, r.veterinarian, r.notes]
        .some(v => String(v || '').toLowerCase().includes(needle))
    );
  }

  records.sort(byDateDesc);

  const total = records.length;
  const capped = limit ? records.slice(0, Number(limit) || total) : records;

  return { success: true, records: capped, total };
};

module.exports = getAllRecords;
