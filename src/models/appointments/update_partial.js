const firestoreManager = require('../../fb/firestore_manager');
const addNotification = require('../notifications/add');

// Partial update so we don't overwrite the appointment document.
const updateAppointmentPartial = async (id, patch = {}) => {
  if (!id) return { success: false, message: 'Missing id.' };

  // Fetch current appointment so we can detect status transitions (e.g., Pending -> Confirmed)
  const before = await firestoreManager.getData('appointments', id);

  // Only allow known fields to be updated.
  const allowed = ['status', 'notes', 'purpose', 'dateTime', 'clientId', 'petId'];
  const data = { id };

  allowed.forEach((k) => {
    if (patch[k] !== undefined) data[k] = patch[k];
  });

  // If date & time are provided, compose dateTime
  if (patch.date !== undefined || patch.time !== undefined) {
    const date = patch.date;
    const time = patch.time;
    if (date && time) {
      data.dateTime = `${date}T${time}:00`;
    }
  }

  if (Object.keys(data).length <= 1) {
    return { success: false, message: 'No fields to update.' };
  }

  try {
    const ok = await firestoreManager.updatePartialData('appointments', data);
    if (!ok) return { success: false, message: 'Failed to update appointment.' };

    const after = await firestoreManager.getData('appointments', id);

    // Notify client when an appointment is confirmed (and optionally when completed)
    try {
      const prevStatus = String(before?.status || '').trim().toLowerCase();
      const nextStatus = String(after?.status || '').trim().toLowerCase();
      const clientId = after?.clientId;

      if (clientId && nextStatus && nextStatus !== prevStatus) {
        if (nextStatus === 'confirmed') {
          await addNotification({
            clientId: String(clientId),
            type: 'appointment_confirmed',
            title: 'Appointment Confirmed',
            message: 'Your appointment request has been confirmed by the clinic.',
            payload: { appointmentId: after?.id }
          });
        }

        if (nextStatus === 'completed') {
          await addNotification({
            clientId: String(clientId),
            type: 'appointment_completed',
            title: 'Appointment Completed',
            message: 'Your appointment has been marked as completed.',
            payload: { appointmentId: after?.id }
          });
        }
      }
    } catch (notifyErr) {
      // Notifications should never block the main update.
      console.warn('appointments/update_partial notification warning:', notifyErr?.message || notifyErr);
    }

    return { success: true, appointment: after || null };
  } catch (error) {
    throw error;
  }
};

module.exports = updateAppointmentPartial;
