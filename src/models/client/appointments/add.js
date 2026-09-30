const firestoreManager = require('../../../fb/firestore_manager');
const { generateAppointmentId } = require('../../../utilities/idGenerator');
const { checkSlotAvailable, dayOf, timeOf, formatTime } = require('../../../utilities/appointmentSlots');
const addNotification = require('../../notifications/add');

// The clinic accepts over-the-counter payment only — no online payment is processed.
const PAYMENT_METHOD = 'over_the_counter';

const isPastDateTime = (date, time) => {
  const dt = new Date(`${date}T${time}:00`);
  if (isNaN(dt)) return true;
  return dt < new Date();
};

/**
 * Put a "new appointment request" in every active employee's notification inbox —
 * admin, staff and veterinarian. The vet has to confirm it; staff and admin manage
 * the schedule.
 */
const notifyClinic = async (appointment) => {
  const [employees, client, pet] = await Promise.all([
    firestoreManager.getAllData('employees', {}),
    firestoreManager.getData('clients', String(appointment.clientId)),
    firestoreManager.getData('pets', String(appointment.petId))
  ]);

  const active = (employees || []).filter(e =>
    String(e?.status || 'Active').toLowerCase() !== 'inactive');

  const time = formatTime(timeOf(appointment.dateTime));
  const message =
    `${client?.name || 'A client'} requested ${appointment.purpose} for ` +
    `${pet?.name || 'their pet'} on ${dayOf(appointment.dateTime)} at ${time}.`;

  await Promise.all(active.map(e =>
    addNotification({
      clientId: String(e.id),   // recipient id — the employee inbox reads the same collection
      type: 'appointment_request',
      title: 'New appointment request',
      message,
      payload: { appointmentId: appointment.id }
    }).catch(() => {})
  ));
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
    notes,
    paymentMethod // over-the-counter only, see below
  } = body || {};

  if (!petId || !date || !time) {
    return { success: false, message: 'Pet, date, and time are required.' };
  }

  if (isPastDateTime(date, time)) {
    return { success: false, message: 'You cannot book an appointment in the past.' };
  }

  if (paymentMethod && String(paymentMethod) !== PAYMENT_METHOD) {
    return {
      success: false,
      message: 'Only over-the-counter payment is supported. Please settle the service fee at the clinic.'
    };
  }

  // Daily cap, the time slot itself, and the same pet twice in one day.
  const slot = await checkSlotAvailable({ date, time, petId });
  if (!slot.ok) {
    return { success: false, message: slot.message, reason: slot.reason };
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
    scheduleChanged: false,
    // Reason the clinic later reschedules/cancels (filled in by the vet, shown to the client)
    reasonType: '',
    statusReason: '',
    // Payment for services is settled at the clinic. Only one method is supported,
    // so anything else the client sends is coerced to it.
    paymentMethod: PAYMENT_METHOD,
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString()
  };

  try {
    const ok = await firestoreManager.addData('appointments', appointmentData);
    if (!ok) {
      return { success: false, message: 'Failed to save appointment.' };
    }

    // Tell the clinic. A failed notification must never fail the booking itself.
    notifyClinic(appointmentData).catch(err =>
      console.warn('client appointment notification warning:', err?.message || err));

    return { success: true, appointment: appointmentData };
  } catch (error) {
    throw error;
  }
};

module.exports = addClientAppointment;
