const firestoreManager = require('../../../fb/firestore_manager');

const pad2 = (n) => String(n).padStart(2, '0');

const normalizeDate = (dateLike) => {
  if (!dateLike) return null;

  if (typeof dateLike === 'object' && typeof dateLike.toDate === 'function') {
    const d = dateLike.toDate();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  if (typeof dateLike === 'string') {
    if (dateLike.includes('T')) {
      return dateLike.split('T')[0];
    }
    return dateLike;
  }

  return null;
};

const getMyRecords = async (clientId) => {
  if (!clientId) {
    return { success: false, message: 'Missing client id.' };
  }

  try {
    // Records
    const recRaw = await firestoreManager.getAllData('records', { ownerId: clientId });
    const records = Array.isArray(recRaw) ? recRaw : [];

    // Pets for names
    const petsRaw = await firestoreManager.getAllData('pets', { ownerId: clientId });
    const pets = Array.isArray(petsRaw) ? petsRaw : [];
    const petMap = new Map();
    pets.forEach(p => {
      if (!p || !p.id) return;
      petMap.set(p.id, p);
    });

    const mapped = records.map(r => {
      const d = normalizeDate(r.date || r.dateTime || r.createdAt);
      const pet = r.petId ? petMap.get(r.petId) : null;

      return {
        id: r.id,
        petId: r.petId || null,
        petName: (pet && (pet.name || pet.petName)) || r.petName || 'Pet',
        type: r.type || r.recordType || 'Record',
        date: d,
        notes: r.notes || '',
        url: r.url || r.fileUrl || null
      };
    }).filter(r => !!r.date);

    return {
      success: true,
      records: mapped,
      pets: pets.map(p => ({
        id: p.id,
        name: p.name || p.petName || 'Pet'
      }))
    };
  } catch (error) {
    throw error;
  }
};

module.exports = getMyRecords;
