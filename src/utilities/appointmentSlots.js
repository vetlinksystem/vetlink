// src/utilities/appointmentSlots.js
// One place that decides whether an appointment slot may be booked.
//
// Why this exists: the daily cap of 5 was checked in two separate places
// (models/appointments/create.js and models/client/appointments/add.js) and nothing
// checked the *time*. Two clients — or the same client twice — could both take
// 11:30 on the same day, which is what the calendar was showing as a double booking.
// Rescheduling through update_partial.js skipped every check entirely.
//
// The rules, in one place:
//   1. Max MAX_PER_DAY active appointments per calendar day.
//   2. One appointment per time slot — a taken time cannot be booked again.
//   3. The same pet cannot hold two active appointments on the same day.

const firestoreManager = require('../fb/firestore_manager');

const MAX_PER_DAY = 5;

// Statuses that free the slot again. Everything else still occupies it.
const RELEASED_STATUSES = ['cancelled', 'canceled', 'declined', 'rejected', 'no_show', 'no show'];

const isReleased = (status) =>
  RELEASED_STATUSES.includes(String(status || '').trim().toLowerCase());

/** 'YYYY-MM-DDTHH:MM:00' -> 'YYYY-MM-DD' */
const dayOf = (dateTime) => String(dateTime || '').slice(0, 10);

/** 'YYYY-MM-DDTHH:MM:00' -> 'HH:MM' (seconds ignored, so 11:30 == 11:30:00) */
const timeOf = (dateTime) => String(dateTime || '').slice(11, 16);

const formatTime = (time) => {
  const [h, m] = String(time || '').split(':');
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return time;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
};

/** Active (slot-occupying) appointments on a given calendar day. */
const activeAppointmentsOn = async (date) => {
  const rows = await firestoreManager.getAllData('appointments', { dateTime: date });
  if (!Array.isArray(rows)) return [];
  return rows.filter(r => dayOf(r.dateTime) === date && !isReleased(r.status));
};

/**
 * Can this slot be booked?
 *
 * @param {Object}  opts
 * @param {string}  opts.date     'YYYY-MM-DD'
 * @param {string}  opts.time     'HH:MM'
 * @param {string} [opts.petId]   the pet being booked, for the same-pet-same-day rule
 * @param {string} [opts.ignoreId] appointment being rescheduled — it must not clash with itself
 * @returns {Promise<{ok: boolean, message?: string, reason?: string}>}
 */
const checkSlotAvailable = async ({ date, time, petId, ignoreId } = {}) => {
  if (!date || !time) return { ok: false, reason: 'missing', message: 'Date and time are required.' };

  const taken = (await activeAppointmentsOn(date))
    .filter(r => !ignoreId || String(r.id) !== String(ignoreId));

  if (taken.length >= MAX_PER_DAY) {
    return {
      ok: false,
      reason: 'day_full',
      message: `This day is fully booked (max ${MAX_PER_DAY} appointments). Please choose another date.`
    };
  }

  if (taken.some(r => timeOf(r.dateTime) === time)) {
    return {
      ok: false,
      reason: 'slot_taken',
      message: `${formatTime(time)} on ${date} is already booked. Please choose another time.`
    };
  }

  if (petId && taken.some(r => String(r.petId) === String(petId))) {
    return {
      ok: false,
      reason: 'pet_double_booked',
      message: 'This pet already has an appointment on that day. Please choose another date.'
    };
  }

  return { ok: true };
};

/** Times already occupied on a day — used to grey out slots in the booking UI. */
const takenTimesOn = async (date, ignoreId) =>
  (await activeAppointmentsOn(date))
    .filter(r => !ignoreId || String(r.id) !== String(ignoreId))
    .map(r => timeOf(r.dateTime))
    .filter(Boolean);

module.exports = {
  MAX_PER_DAY,
  RELEASED_STATUSES,
  isReleased,
  dayOf,
  timeOf,
  activeAppointmentsOn,
  checkSlotAvailable,
  takenTimesOn
};
