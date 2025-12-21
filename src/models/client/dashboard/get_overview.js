const firestoreManager = require('../../../fb/firestore_manager');

const pad2 = (n) => String(n).padStart(2, '0');

const normalizeDateTime = (dateTime) => {
  if (!dateTime) return null;

  // Firestore Timestamp
  if (typeof dateTime === 'object' && typeof dateTime.toDate === 'function') {
    const d = dateTime.toDate();
    const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    return { date, time };
  }

  if (typeof dateTime === 'string') {
    let datePart = null;
    let timePart = null;

    if (dateTime.includes('T')) {
      [datePart, timePart] = dateTime.split('T');
    } else if (dateTime.includes(' ')) {
      [datePart, timePart] = dateTime.split(' ');
    } else {
      datePart = dateTime;
    }

    if (timePart) {
      if (timePart.includes('+')) timePart = timePart.split('+')[0];
      if (timePart.includes('Z')) timePart = timePart.replace('Z', '');
      const [h, m] = timePart.split(':');
      timePart = `${pad2(Number(h) || 0)}:${pad2(Number(m) || 0)}`;
    }

    return {
      date: datePart,
      time: timePart || null
    };
  }

  return null;
};

const getClientDashboardOverview = async (clientId) => {
  if (!clientId) {
    return { success: false, message: 'Missing client id.' };
  }

  try {
    const [appointmentsRaw, petsRaw] = await Promise.all([
      firestoreManager.getAllData('appointments', { clientId }),
      firestoreManager.getAllData('pets', { ownerId: clientId })
    ]);

    let recordsRaw = [];
    try {
      // Optional: if "records" collection doesn’t exist yet, this will just be empty.
      recordsRaw = await firestoreManager.getAllData('records', { ownerId: clientId });
    } catch (e) {
      recordsRaw = [];
    }

    const pets = Array.isArray(petsRaw) ? petsRaw : [];
    const petMap = new Map();
    pets.forEach(p => {
      if (!p || !p.id) return;
      petMap.set(p.id, p);
    });

    const appointments = (Array.isArray(appointmentsRaw) ? appointmentsRaw : [])
      .map(a => {
        const dt = normalizeDateTime(a.dateTime || a.date || null);
        const pet = a.petId ? petMap.get(a.petId) : null;
        const statusRaw = (a.status || '').toString();
        const status = statusRaw || 'Pending';

        return {
          id: a.id,
          petId: a.petId || null,
          pet: (pet && (pet.name || pet.petName)) || a.petName || 'Pet',
          service: a.purpose || a.service || 'Appointment',
          date: dt?.date || null,
          time: dt?.time || null,
          status
        };
      })
      .filter(a => !!a.date);

    const records = (Array.isArray(recordsRaw) ? recordsRaw : []).map(r => {
      const dt = normalizeDateTime(r.date || r.dateTime || null);
      const pet = r.petId ? petMap.get(r.petId) : null;
      return {
        id: r.id,
        petId: r.petId || null,
        pet: (pet && (pet.name || pet.petName)) || r.petName || 'Pet',
        type: r.type || r.recordType || 'Record',
        date: dt?.date || null,
        url: r.url || r.fileUrl || '#'
      };
    });

    return {
      success: true,
      appointments,
      pets: pets.map(p => ({
        id: p.id,
        name: p.name || p.petName || 'Pet',
        species: p.species || '',
        breed: p.breed || ''
      })),
      records,
      petsTotal: pets.length
    };
  } catch (error) {
    throw error;
  }
};

module.exports = getClientDashboardOverview;
