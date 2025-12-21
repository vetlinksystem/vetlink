const firestoreManager = require('../../fb/firestore_manager');
const { generateAppointmentId } = require('../../utilities/idGenerator');

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
