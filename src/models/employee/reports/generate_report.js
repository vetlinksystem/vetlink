// src/models/employee/reports/generate_report.js
//
// Builds the clinic's periodic report. Nothing here is hand-entered: every figure is
// derived from the live collections, so opening the Reports page (or hitting the API
// on a schedule) always produces a current report for the requested period.
//
// Date fields differ per collection, so each section states which one it buckets on:
//   appointments — dateTime (when the visit is booked for)
//   clients/pets — createdAt (when they joined the clinic)
//   records      — date, falling back to createdAt
//   breeding     — requestedAt, falling back to createdAt

const firestoreManager = require('../../../fb/firestore_manager');
const { resolveSpecies } = require('../../../utilities/breedCatalog');

const clean = (v) => String(v ?? '').trim();
const lower = (v) => clean(v).toLowerCase();

/** Pull the YYYY-MM-DD out of an ISO string, a date-only string, or a Date. */
const toISODate = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  // Firestore Timestamp
  if (typeof value?.toDate === 'function') {
    try { return value.toDate().toISOString().slice(0, 10); } catch { return ''; }
  }
  const s = clean(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

/** First non-empty date among the given fields. */
const pickDate = (doc, fields) => {
  for (const f of fields) {
    const d = toISODate(doc?.[f]);
    if (d) return d;
  }
  return '';
};

const inRange = (iso, from, to) => !!iso && iso >= from && iso <= to;

/** Count occurrences into a plain object, skipping blanks. */
const tally = (items, keyFn, { fallback = 'Unspecified' } = {}) => {
  const out = {};
  for (const it of items) {
    const raw = keyFn(it);
    const key = clean(raw) || fallback;
    out[key] = (out[key] || 0) + 1;
  }
  return out;
};

/** Object -> [{ label, count, percent }] sorted high to low. */
const toRows = (counts) => {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      percent: total ? Math.round((count / total) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

/** Title-case a status so "Completed" and "completed" don't split into two rows. */
const titleCase = (s) => {
  const t = clean(s);
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

const TREND_MAX_MONTHS = 24;

/**
 * Month-by-month counts across the period, for the trend table.
 * Returns [{ month: '2026-07', label: 'Jul 2026', appointments, pets, clients, records }]
 *
 * A very wide range (notably "all time") is clamped to the most recent
 * TREND_MAX_MONTHS so the table shows the months that actually hold data rather
 * than filling up with empty ones from the start of the range.
 */
const buildTrend = (from, to, sets) => {
  const months = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return months;

  // Earliest month we would show if we honoured `from` exactly...
  let firstYear = start.getUTCFullYear();
  let firstMonth = start.getUTCMonth();

  // ...pulled forward when that would exceed the cap.
  const span =
    (end.getUTCFullYear() - firstYear) * 12 + (end.getUTCMonth() - firstMonth) + 1;
  if (span > TREND_MAX_MONTHS) {
    const clamped = new Date(Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth() - (TREND_MAX_MONTHS - 1),
      1
    ));
    firstYear = clamped.getUTCFullYear();
    firstMonth = clamped.getUTCMonth();
  }

  const cursor = new Date(Date.UTC(firstYear, firstMonth, 1));
  while (cursor <= end && months.length < TREND_MAX_MONTHS) {
    const key = cursor.toISOString().slice(0, 7);
    months.push({
      month: key,
      label: cursor.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      appointments: sets.appointments.filter(d => d.startsWith(key)).length,
      pets: sets.pets.filter(d => d.startsWith(key)).length,
      clients: sets.clients.filter(d => d.startsWith(key)).length,
      records: sets.records.filter(d => d.startsWith(key)).length
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  // Drop empty months at each end so a wide range ("all time") shows the months that
  // actually hold activity. Gaps in the middle are kept — a quiet month between two
  // busy ones is itself worth seeing.
  const isEmpty = (m) => !m.appointments && !m.pets && !m.clients && !m.records;
  let first = 0;
  let last = months.length - 1;
  while (first <= last && isEmpty(months[first])) first++;
  while (last >= first && isEmpty(months[last])) last--;

  return first > last ? [] : months.slice(first, last + 1);
};

/**
 * Generate the clinic report for a period.
 *
 * @param {Object} opts
 * @param {string} opts.from  inclusive YYYY-MM-DD
 * @param {string} opts.to    inclusive YYYY-MM-DD
 * @returns {Promise<Object>} { success, report }
 */
const generateReport = async ({ from, to } = {}) => {
  const fromISO = toISODate(from);
  const toISO = toISODate(to);

  if (!fromISO || !toISO) {
    return { success: false, message: 'A valid start and end date are required.' };
  }
  if (fromISO > toISO) {
    return { success: false, message: 'The start date must not be after the end date.' };
  }

  const [appointmentsRaw, clientsRaw, petsRaw, recordsRaw, breedingRaw] = await Promise.all([
    firestoreManager.getAllData('appointments', {}),
    firestoreManager.getAllData('clients', {}),
    firestoreManager.getAllData('pets', {}),
    firestoreManager.getAllData('records', {}),
    firestoreManager.getAllData('breeding', {})
  ]);

  const asArray = (v) => (Array.isArray(v) ? v : []);

  // ===== Bucket each collection on its own date field =====
  const dateOf = {
    appointment: (a) => pickDate(a, ['dateTime', 'date', 'createdAt']),
    client: (c) => pickDate(c, ['createdAt']),
    pet: (p) => pickDate(p, ['createdAt']),
    record: (r) => pickDate(r, ['date', 'createdAt']),
    breeding: (b) => pickDate(b, ['requestedAt', 'createdAt', 'decidedAt'])
  };

  const appointments = asArray(appointmentsRaw).filter(a => inRange(dateOf.appointment(a), fromISO, toISO));
  const newClients = asArray(clientsRaw).filter(c => inRange(dateOf.client(c), fromISO, toISO));
  const newPets = asArray(petsRaw).filter(p => inRange(dateOf.pet(p), fromISO, toISO));
  const records = asArray(recordsRaw).filter(r => inRange(dateOf.record(r), fromISO, toISO));
  const breeding = asArray(breedingRaw).filter(b => inRange(dateOf.breeding(b), fromISO, toISO));

  // ===== Appointments =====
  const apptByStatus = tally(appointments, a => titleCase(a.status) || 'Pending');
  const completed = appointments.filter(a => ['completed', 'done'].includes(lower(a.status))).length;
  const cancelled = appointments.filter(a => ['cancelled', 'canceled'].includes(lower(a.status))).length;
  const pending = appointments.filter(a => lower(a.status) === 'pending').length;

  const completionRate = appointments.length
    ? Math.round((completed / appointments.length) * 1000) / 10
    : 0;
  const cancellationRate = appointments.length
    ? Math.round((cancelled / appointments.length) * 1000) / 10
    : 0;

  // Cancellation reasons are mandatory clinic-side, so they are worth reporting.
  const cancelledWithReason = appointments.filter(
    a => ['cancelled', 'canceled'].includes(lower(a.status)) && clean(a.statusReason)
  );

  // ===== Registrations =====
  const petsBySpecies = tally(newPets, p => resolveSpecies(p.breed || '', p.species || '') || 'Dog');
  const petsByBreed = tally(newPets, p => p.breed, { fallback: 'Unrecorded breed' });
  const petsBySex = tally(newPets, p => titleCase(p.sex), { fallback: 'Unrecorded' });

  // ===== Medical records =====
  const recordsByType = tally(records, r => r.type || r.recordType, { fallback: 'Untyped' });
  const petsSeen = new Set(records.map(r => clean(r.petId)).filter(Boolean)).size;

  // ===== Breeding =====
  const breedingByStatus = tally(breeding, b => titleCase(b.status) || 'Pending');
  const breedingApproved = breeding.filter(b => ['approved', 'cleared', 'completed'].includes(lower(b.status))).length;

  // ===== Trend =====
  const trend = buildTrend(fromISO, toISO, {
    appointments: appointments.map(dateOf.appointment),
    pets: newPets.map(dateOf.pet),
    clients: newClients.map(dateOf.client),
    records: records.map(dateOf.record)
  });

  return {
    success: true,
    report: {
      generatedAt: new Date().toISOString(),
      period: { from: fromISO, to: toISO },

      overview: {
        appointments: appointments.length,
        newClients: newClients.length,
        newPets: newPets.length,
        medicalRecords: records.length,
        breedingRequests: breeding.length,
        completionRate,
        cancellationRate
      },

      appointments: {
        total: appointments.length,
        completed,
        pending,
        cancelled,
        completionRate,
        cancellationRate,
        byStatus: toRows(apptByStatus),
        byPurpose: toRows(tally(appointments, a => a.purpose || a.service, { fallback: 'Unspecified' })),
        cancellationReasons: cancelledWithReason.map(a => ({
          date: dateOf.appointment(a),
          reasonType: clean(a.reasonType) || 'cancelled',
          reason: clean(a.statusReason)
        }))
      },

      registrations: {
        newClients: newClients.length,
        newPets: newPets.length,
        petsBySpecies: toRows(petsBySpecies),
        petsByBreed: toRows(petsByBreed),
        petsBySex: toRows(petsBySex)
      },

      medicalRecords: {
        total: records.length,
        petsSeen,
        byType: toRows(recordsByType)
      },

      breeding: {
        total: breeding.length,
        approved: breedingApproved,
        byStatus: toRows(breedingByStatus)
      },

      trend
    }
  };
};

module.exports = generateReport;
