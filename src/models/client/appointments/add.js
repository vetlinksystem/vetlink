const firestoreManager = require('../../../fb/firestore_manager');
const { generateAppointmentId } = require('../../../utilities/idGenerator');

const pad2 = (n) => String(n).padStart(2, '0');

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
