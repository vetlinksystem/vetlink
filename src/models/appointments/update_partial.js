const firestoreManager = require('../../fb/firestore_manager');
const addNotification = require('../notifications/add');

// Partial update so we don't overwrite the appointment document.
const updateAppointmentPartial = async (id, patch = {}) => {
  if (!id) return { success: false, message: 'Missing id.' };

  // Fetch current appointment so we can detect status transitions (e.g., Pending -> Confirmed)
  const before = await firestoreManager.getData('appointments', id);

  // Only allow known fields to be updated.
  const allowed = [
    'status', 'notes', 'purpose', 'dateTime', 'clientId', 'petId',
    // Reason the clinic changed the appointment (rescheduled / cancelled) — shown to the client.
    'reasonType', 'statusReason',
    // Payment is over-the-counter only; the clinic marks it paid on site.
    'paymentMethod', 'paymentStatus'
  ];
  const data = { id };

  allowed.forEach((k) => {
    if (patch[k] !== undefined) data[k] = patch[k];
  });

  const CANCELLED_STATUSES = ['cancelled', 'canceled', 'declined', 'rejected'];
  const nextStatusRaw = String(data.status ?? before?.status ?? '').trim().toLowerCase();
  const prevStatusRaw = String(before?.status || '').trim().toLowerCase();
  const isBecomingCancelled =
    data.status !== undefined &&
    CANCELLED_STATUSES.includes(nextStatusRaw) &&
    !CANCELLED_STATUSES.includes(prevStatusRaw);

  // If date & time are provided, compose dateTime
  if (patch.date !== undefined || patch.time !== undefined) {
    const date = patch.date;
    const time = patch.time;
    if (date && time) {
      data.dateTime = `${date}T${time}:00`;
    }
  }

  // Flag if the date/time was changed by the clinic.
  const isRescheduled =
    data.dateTime !== undefined && String(data.dateTime) !== String(before?.dateTime || '');
  if (isRescheduled) {
    data.scheduleChanged = true;
  }

  // A reason is mandatory whenever the clinic cancels or reschedules — the client
  // is always told *why*, not just that something changed.
  const reasonText = String(data.statusReason ?? '').trim();
  if ((isBecomingCancelled || isRescheduled) && !reasonText) {
    return {
      success: false,
      message: isBecomingCancelled
        ? 'Please provide a reason for cancelling this appointment.'
        : 'Please provide a reason for rescheduling this appointment.'
    };
  }
  if (reasonText) {
    data.statusReason = reasonText;
    data.reasonType = String(data.reasonType || (isBecomingCancelled ? 'cancelled' : 'rescheduled'));
    data.reasonSetAt = new Date().toISOString();
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

        // Cancellation used to update silently — the client was never told, and never
        // told why. Both are now sent.
        if (CANCELLED_STATUSES.includes(nextStatus)) {
          const reason = String(after?.statusReason || '').trim();
          await addNotification({
            clientId: String(clientId),
            type: 'appointment_cancelled',
            title: 'Appointment Cancelled',
            message: `Your appointment has been cancelled by the clinic.${reason ? ` Reason: ${reason}` : ''}`,
            payload: {
              appointmentId: after?.id || null,
              reasonType: after?.reasonType || 'cancelled',
              statusReason: reason
            }
          });
        }
      }

      if (clientId && data.scheduleChanged) {
        const petId = after?.petId || before?.petId;
        const petDoc = petId ? await firestoreManager.getData('pets', petId) : null;
        const petName = petDoc?.name || 'your pet';

        const fmtDT = (dt) => {
          if (!dt) return 'unknown';
          const [datePart, timePart] = String(dt).split('T');
          if (!datePart) return dt;
          const [y, m, d] = datePart.split('-');
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const monthName = months[parseInt(m, 10) - 1] || m;
          let timeStr = '';
          if (timePart) {
            const [h, min] = timePart.split(':');
            const hour = parseInt(h, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            timeStr = ` at ${hour12}:${min} ${ampm}`;
          }
          return `${monthName} ${parseInt(d, 10)}, ${y}${timeStr}`;
        };

        const oldDT = fmtDT(before?.dateTime);
        const newDT = fmtDT(after?.dateTime);

        const reason = String(after?.statusReason || '').trim();

        await addNotification({
          clientId: String(clientId),
          type: 'appointment_schedule_changed',
          title: 'Appointment Rescheduled',
          message: `Your appointment for ${petName} has been rescheduled from ${oldDT} to ${newDT}.${reason ? ` Reason: ${reason}` : ''}`,
          payload: {
            appointmentId: after?.id || null,
            newDateTime: after?.dateTime || null,
            reasonType: after?.reasonType || 'rescheduled',
            statusReason: reason
          }
        });
      }
    } catch (notifyErr) {
      console.warn('appointments/update_partial notification warning:', notifyErr?.message || notifyErr);
    }

    return { success: true, appointment: after || null };
  } catch (error) {
    throw error;
  }
};

module.exports = updateAppointmentPartial;
