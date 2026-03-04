const firestoreManager = require('../../fb/firestore_manager');
const { generateAppointmentId } = require('../../utilities/idGenerator');

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

// Create an appointment (used by Employee UI). Uses same schema as client appointment creation.
const createAppointment = async (body = {}) => {
  const {
    clientId,
    petId,
    date, // YYYY-MM-DD
    time, // HH:MM
    purpose,
    notes,
    status
  } = body;

  if (!clientId || !petId || !date || !time) {
    return { success: false, message: 'Client, pet, date, and time are required.' };
  }

  // Block appointments in the past
  if (isPastDateTime(date, time)) {
    return { success: false, message: 'You cannot schedule an appointment in the past.' };
  }

  // Limit: max 5 appointments per day (excluding cancelled)
  const bookedCount = await countAppointmentsForDate(date);
  if (bookedCount >= 5) {
    return { success: false, message: 'This day is fully booked (max 5 appointments). Please choose another date.' };
  }

  // Use sequential, human-friendly IDs (a1001, a1002, ...)
  const id = await generateAppointmentId();
  const dateTime = `${date}T${time}:00`;

  const appointmentData = {
    id,
    clientId: String(clientId),
    petId: String(petId),
    dateTime,
    purpose: purpose || 'Appointment',
    notes: notes || '',
    status: status || 'Pending',
    createdAt: new Date().toISOString()
  };

  try {
    const ok = await firestoreManager.addData('appointments', appointmentData);
    if (!ok) return { success: false, message: 'Failed to save appointment.' };
    return { success: true, appointment: appointmentData };
  } catch (error) {
    throw error;
  }
};

module.exports = createAppointment;
