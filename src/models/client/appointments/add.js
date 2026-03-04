const firestoreManager = require('../../../fb/firestore_manager');
const { generateAppointmentId } = require('../../../utilities/idGenerator');

const pad2 = (n) => String(n).padStart(2, '0');

const isPastDateTime = (date, time) => {
  const dt = new Date(`${date}T${time}:00`);
  if (isNaN(dt)) return true;
  return dt < new Date();
};

const countAppointmentsForDate = async (date) => {
  const rows = await firestoreManager.getAllData('appointments', { dateTime: date });
  if (!Array.isArray(rows)) return 0;
  return rows.filter(r => String(r.dateTime || '').startsWith(date) && String(r.status || '').toLowerCase() !== 'cancelled').length;
};

const addClientAppointment = async (clientId, body) => {
  if (!clientId) {
    return { success: false, message: 'Missing client id.' };
  }

  const {
    petId,
    date,    // 'YYYY-MM-DD'
    time,    // 'HH:MM'
    service, // e.g. 'Check-up'
    notes
  } = body || {};

  if (!petId || !date || !time) {
    return { success: false, message: 'Pet, date, and time are required.' };
  }

  if (isPastDateTime(date, time)) {
    return { success: false, message: 'You cannot book an appointment in the past.' };
  }

  const bookedCount = await countAppointmentsForDate(date);
  if (bookedCount >= 5) {
    return { success: false, message: 'This day is fully booked (max 5 appointments). Please choose another date.' };
  }

  // Use sequential, human-friendly IDs (a1001, a1002, ...)
  const id = await generateAppointmentId();

  const dateTime = `${date}T${time}:00`;

  const appointmentData = {
    id,
    clientId,
    petId,
    dateTime,
    purpose: service || 'Appointment',
    notes: notes || '',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  try {
    const ok = await firestoreManager.addData('appointments', appointmentData);
    if (!ok) {
      return { success: false, message: 'Failed to save appointment.' };
    }
    return { success: true, appointment: appointmentData };
  } catch (error) {
    throw error;
  }
};

module.exports = addClientAppointment;
