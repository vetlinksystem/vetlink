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
//   4. Only inside clinic hours: Monday–Saturday, 8:00 AM–5:00 PM, on a 30-minute slot.
//   5. Never in the past (judged in clinic time, not the server's time zone).

const firestoreManager = require('../fb/firestore_manager');

const MAX_PER_DAY = 5;

// Clinic hours. Slots start every SLOT_MINUTES from OPEN_HOUR; the last one ends at CLOSE_HOUR.
const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 30;
const CLOSED_WEEKDAYS = [0]; // Sunday
const HOURS_LABEL = 'Monday–Saturday, 8:00 AM–5:00 PM';

// The clinic is in the Philippines (UTC+8, no daylight saving). The server may run in
// UTC, so "now" is shifted before comparing it with a booked date and time.
const CLINIC_UTC_OFFSET_HOURS = 8;

const pad2 = (n) => String(n).padStart(2, '0');

/** Every bookable start time of a day: ['08:00', '08:30', ..., '16:30'] */
const SLOT_TIMES = (() => {
  const out = [];
  for (let mins = OPEN_HOUR * 60; mins < CLOSE_HOUR * 60; mins += SLOT_MINUTES) {
    out.push(`${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`);
  }
  return out;
})();

/** Current clinic time as 'YYYY-MM-DDTHH:MM'. */
const clinicNow = () =>
  new Date(Date.now() + CLINIC_UTC_OFFSET_HOURS * 3600 * 1000).toISOString().slice(0, 16);

const isPast = (date, time) => `${date}T${time}` < clinicNow();

/** Is the clinic open on this 'YYYY-MM-DD'? */
const isOpenDay = (date) => {
  const d = new Date(`${date}T00:00:00Z`);
  if (isNaN(d)) return false;
  return !CLOSED_WEEKDAYS.includes(d.getUTCDay());
};

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

  time = timeOf(`${date}T${time}`);

  if (!isOpenDay(date)) {
    return {
      ok: false,
      reason: 'closed_day',
      message: `The clinic is closed on that day. Clinic hours are ${HOURS_LABEL}.`
    };
  }

  if (!SLOT_TIMES.includes(time)) {
    return {
      ok: false,
      reason: 'outside_hours',
      message: `Please choose a ${SLOT_MINUTES}-minute slot within clinic hours (${HOURS_LABEL}).`
    };
  }

  if (isPast(date, time)) {
    return { ok: false, reason: 'past', message: 'You cannot book an appointment in the past.' };
  }

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

/**
 * Every slot of a day with its state, for the booking screens (web and Android).
 * status: 'available' | 'taken' | 'past' | 'full' (day reached MAX_PER_DAY).
 */
const slotsOn = async (date, ignoreId) => {
  const open = isOpenDay(date);
  const taken = open ? await takenTimesOn(date, ignoreId) : [];
  const full = taken.length >= MAX_PER_DAY;

  const slots = !open ? [] : SLOT_TIMES.map((time, i) => {
    const end = SLOT_TIMES[i + 1] || `${pad2(CLOSE_HOUR)}:00`;
    let status = 'available';
    if (taken.includes(time)) status = 'taken';
    else if (isPast(date, time)) status = 'past';
    else if (full) status = 'full';
    return { time, end, label: `${formatTime(time)} – ${formatTime(end)}`, status };
  });

  return { open, taken, full, slots };
};

module.exports = {
  MAX_PER_DAY,
  HOURS_LABEL,
  CLOSED_WEEKDAYS,
  SLOT_TIMES,
  isOpenDay,
  slotsOn,
  RELEASED_STATUSES,
  isReleased,
  dayOf,
  timeOf,
  formatTime,
  activeAppointmentsOn,
  checkSlotAvailable,
  takenTimesOn
};
