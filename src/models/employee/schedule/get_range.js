const firestoreManager = require('../../../fb/firestore_manager');

const pad2 = (n) => String(n).padStart(2, '0');
const toISODate = (d) => {
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
};

const normalizeDateTime = (dateTime) => {
  if (!dateTime) return null;

  // Firestore Timestamp support
  if (typeof dateTime === 'object' && typeof dateTime.toDate === 'function') {
    const d = dateTime.toDate();
    const date = toISODate(d);
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
      // Only date
      datePart = dateTime;
    }

    if (timePart && timePart.includes('+')) {
      timePart = timePart.split('+')[0];
    }
    if (timePart && timePart.includes('Z')) {
      timePart = timePart.replace('Z', '');
    }

    if (timePart) {
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

const getScheduleRange = async ({ from, to }) => {
  const fromDate = from ? new Date(from + 'T00:00:00') : null;
  const toDate   = to ? new Date(to + 'T23:59:59') : null;

  const [appointments, clients, pets] = await Promise.all([
    firestoreManager.getAllData('appointments', {}),
    firestoreManager.getAllData('clients', {}),
    firestoreManager.getAllData('pets', {})
  ]);

  const clientMap = new Map();
  clients.forEach(c => {
    if (!c || !c.id) return;
    clientMap.set(c.id, c);
  });

  const petMap = new Map();
  pets.forEach(p => {
    if (!p || !p.id) return;
    petMap.set(p.id, p);
  });

  const items = [];

  appointments.forEach(a => {
    if (!a || !a.dateTime) return;

    const dt = normalizeDateTime(a.dateTime);
    if (!dt || !dt.date) return;

    const day = new Date(dt.date + 'T00:00:00');
    if (fromDate && day < fromDate) return;
    if (toDate && day > toDate) return;

    const client = a.clientId ? clientMap.get(a.clientId) : null;
    const pet    = a.petId ? petMap.get(a.petId) : null;

    const statusRaw = (a.status || '').toLowerCase();
    let status = 'ok';
    if (statusRaw === 'pending') status = 'warn';
    else if (['cancelled','canceled','declined'].includes(statusRaw)) status = 'cancel';

    items.push({
      id: a.id,
      date: dt.date,
      start: dt.time || null,
      end: null,
      purpose: a.purpose || a.service || 'Appointment',
      ownerId: a.clientId || null,
      ownerName: client?.name || client?.fullName || (a.clientId ? `Client #${a.clientId}` : ''),
      petId: a.petId || pet?.id || null,
      petName: pet?.name || a.petName || '',
      status
    });
  });

  return items;
};

module.exports = getScheduleRange;
