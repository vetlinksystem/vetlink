const firestoreManager = require('../../../fb/firestore_manager');
const { formatAge } = require('../../../utilities/petUtils');

const pad2 = (n) => String(n).padStart(2, '0');

const toDateOnly = (v) => {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.toDate === 'function') {
    const d = v.toDate();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  const s = String(v);
  return s.includes('T') ? s.split('T')[0] : s;
};

/**
 * "Pet Records" — the clinic-wide register of every pet, with its owner, record count
 * and last visit. Requested so staff and vets can look a pet up without going through
 * the owner first.
 *
 * Filters (all optional): q, species, sex, breedingOnly, ownerId
 */
const getPetRegister = async (filters = {}) => {
  const { q, species, sex, breedingOnly, ownerId } = filters;

  const [petsRaw, clientsRaw, recordsRaw, appointmentsRaw] = await Promise.all([
    firestoreManager.getAllData('pets', {}),
    firestoreManager.getAllData('clients', {}),
    firestoreManager.getAllData('records', {}),
    firestoreManager.getAllData('appointments', {})
  ]);

  const clientById = new Map();
  (Array.isArray(clientsRaw) ? clientsRaw : []).forEach(c => {
    if (c && c.id) clientById.set(String(c.id), c);
  });

  // Record count + most recent record date, per pet.
  const recordStats = new Map();
  (Array.isArray(recordsRaw) ? recordsRaw : []).forEach(r => {
    const key = String(r?.petId || '');
    if (!key) return;
    const date = toDateOnly(r.date || r.createdAt);
    const cur = recordStats.get(key) || { count: 0, lastDate: null };
    cur.count += 1;
    if (date && (!cur.lastDate || date > cur.lastDate)) cur.lastDate = date;
    recordStats.set(key, cur);
  });

  // Most recent completed/confirmed visit, per pet.
  const lastVisit = new Map();
  (Array.isArray(appointmentsRaw) ? appointmentsRaw : []).forEach(a => {
    const key = String(a?.petId || '');
    if (!key) return;
    const status = String(a.status || '').toLowerCase();
    if (!['confirmed', 'completed'].includes(status)) return;
    const date = toDateOnly(a.dateTime);
    if (!date) return;
    const cur = lastVisit.get(key);
    if (!cur || date > cur) lastVisit.set(key, date);
  });

  let pets = (Array.isArray(petsRaw) ? petsRaw : []).map(p => {
    const owner = clientById.get(String(p.ownerId || ''));
    const stats = recordStats.get(String(p.id)) || { count: 0, lastDate: null };
    const ageMonths = typeof p.ageMonths === 'number'
      ? p.ageMonths
      : (typeof p.age === 'number' ? p.age * 12 : null);

    return {
      id: p.id,
      name: p.name || p.petName || 'Pet',
      species: p.species || '',
      breed: p.breed || '',
      sex: p.sex || '',
      size: p.size || '',
      weight: typeof p.weight === 'number' ? p.weight : null,
      ageMonths,
      ageText: formatAge(ageMonths),
      description: p.description || p.notes || '',
      breedingAllowed: !!(p.breedingAllowed ?? p.allowBreeding),
      breedingType: p.breedingType || '',
      imageUrl: p.imageUrl || null,
      ownerId: p.ownerId || null,
      ownerName: owner?.name || '',
      ownerNumber: owner?.number || '',
      recordCount: stats.count,
      lastRecordDate: stats.lastDate,
      lastVisitDate: lastVisit.get(String(p.id)) || null,
      createdAt: p.createdAt || null
    };
  });

  if (ownerId) pets = pets.filter(p => String(p.ownerId) === String(ownerId));
  if (species) pets = pets.filter(p => String(p.species).toLowerCase() === String(species).toLowerCase());
  if (sex) pets = pets.filter(p => String(p.sex).toLowerCase() === String(sex).toLowerCase());
  if (breedingOnly) pets = pets.filter(p => p.breedingAllowed);

  if (q) {
    const needle = String(q).toLowerCase();
    pets = pets.filter(p =>
      [p.id, p.name, p.breed, p.species, p.ownerName, p.ownerNumber]
        .some(v => String(v || '').toLowerCase().includes(needle))
    );
  }

  pets.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  // Small summary so the page can show counts without recomputing client-side.
  const summary = {
    total: pets.length,
    bySpecies: pets.reduce((acc, p) => {
      const key = p.species || 'Unspecified';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    breedingAvailable: pets.filter(p => p.breedingAllowed).length,
    withRecords: pets.filter(p => p.recordCount > 0).length
  };

  return { success: true, pets, summary };
};

module.exports = getPetRegister;
