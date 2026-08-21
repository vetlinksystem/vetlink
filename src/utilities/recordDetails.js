// src/utilities/recordDetails.js
// Normalizes the per-type detail block on a medical record.
//
// The clinic keeps five kinds of record, each with its own form and its own controlled
// vocabulary (see utilities/catalogs.js). Rather than five collections, every record
// lives in `records` with `recordType` plus a `details` object shaped for that type.
// Unknown keys are dropped so a stray form field cannot write arbitrary data.

const {
  RECORD_TYPE_KEYS,
  SURGERY_PROCEDURES,
  ANESTHESIA_TYPES,
  VACCINE_TYPES,
  VACCINE_ROUTES,
  GROOMING_TYPES,
  BODY_CONDITIONS,
  HYDRATION_STATUSES,
  SCREENING_RESULTS,
  SCREENING_AREAS,
  OVERALL_ASSESSMENTS,
  VISIT_REASONS,
  SURGERY_OUTCOMES
} = require('./catalogs');

const clean = (v) => String(v ?? '').trim();

const num = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Keep only values that appear in the allowed list (case-insensitive). */
const pickFrom = (list, value) => {
  const v = clean(value);
  if (!v) return '';
  const hit = list.find((x) => x.toLowerCase() === v.toLowerCase());
  return hit || '';
};

/** Multi-select: filter an array down to allowed values, de-duplicated. */
const pickMany = (list, values) => {
  const arr = Array.isArray(values)
    ? values
    : clean(values) ? clean(values).split(',') : [];
  const out = [];
  arr.forEach((raw) => {
    const hit = pickFrom(list, raw);
    if (hit && !out.includes(hit)) out.push(hit);
  });
  return out;
};

const buildDetails = {
  grooming: (b) => ({
    groomingTypes: pickMany(GROOMING_TYPES, b.groomingTypes),   // checkboxes
    serviceDetails: clean(b.serviceDetails),
    productsUsed: clean(b.productsUsed),
    nextAppointment: clean(b.nextAppointment)
  }),

  vaccination: (b) => ({
    vaccineName: clean(b.vaccineName),
    vaccineType: pickFrom(VACCINE_TYPES, b.vaccineType),
    manufacturer: clean(b.manufacturer),
    batchNo: clean(b.batchNo),
    route: pickFrom(VACCINE_ROUTES, b.route),
    siteOfInjection: clean(b.siteOfInjection),
    dateGiven: clean(b.dateGiven),
    nextDueDate: clean(b.nextDueDate)
  }),

  checkup: (b) => ({
    reasonForVisit: pickFrom(VISIT_REASONS, b.reasonForVisit),
    bodyWeight: num(b.bodyWeight),
    temperature: num(b.temperature),
    heartRate: num(b.heartRate),
    findings: clean(b.findings),
    treatment: clean(b.treatment)
  }),

  general_checkup: (b) => {
    // One result per body system, keyed by the area name.
    const screening = {};
    SCREENING_AREAS.forEach((area) => {
      const raw = (b.screening && b.screening[area]) ?? b[`screening_${area}`];
      const value = pickFrom(SCREENING_RESULTS, raw);
      if (value) screening[area] = value;
    });

    return {
      bodyCondition: pickFrom(BODY_CONDITIONS, b.bodyCondition),
      hydrationStatus: pickFrom(HYDRATION_STATUSES, b.hydrationStatus),
      screening,
      others: clean(b.others),
      overallAssessment: pickFrom(OVERALL_ASSESSMENTS, b.overallAssessment)
    };
  },

  surgery: (b) => ({
    procedure: pickFrom(SURGERY_PROCEDURES, b.procedure),
    anesthesiaTypes: pickMany(ANESTHESIA_TYPES, b.anesthesiaTypes),  // checkboxes
    surgeon: clean(b.surgeon),
    assistant: clean(b.assistant),
    startTime: clean(b.startTime),
    endTime: clean(b.endTime),
    preOperativeDiagnosis: clean(b.preOperativeDiagnosis),
    postOperativeDiagnosis: clean(b.postOperativeDiagnosis),
    outcome: pickFrom(SURGERY_OUTCOMES, b.outcome),
    medicationsGiven: clean(b.medicationsGiven)
  })
};

/** The one field per type that must be filled in for the record to mean anything. */
const REQUIRED = {
  grooming:        [['groomingTypes', 'Select at least one grooming service.']],
  vaccination:     [['vaccineName', 'Vaccine name is required.']],
  checkup:         [['reasonForVisit', 'Reason for visit is required.'],
                    ['findings', 'Findings / diagnosis is required.']],
  general_checkup: [['bodyCondition', 'Body condition is required.'],
                    ['overallAssessment', 'Overall assessment is required.']],
  surgery:         [['procedure', 'Surgery / procedure is required.'],
                    ['outcome', 'Outcome is required.']]
};

/**
 * Resolve the record type from whatever the form sent.
 * Accepts the key ("general_checkup") or the label ("General Check Up").
 */
const resolveRecordType = (value) => {
  const v = clean(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (RECORD_TYPE_KEYS.includes(v)) return v;
  // "check_up" / "checkup" both mean checkup
  if (v === 'check_up') return 'checkup';
  if (v === 'general_check_up') return 'general_checkup';
  return '';
};

/**
 * Build and validate the details block for a record.
 * Returns { ok, recordType, details, message }.
 */
const normalizeRecordDetails = (body = {}) => {
  const recordType = resolveRecordType(body.recordType || body.type);
  if (!recordType) {
    return {
      ok: false,
      message: 'Choose a record type: Check Up, General Check Up, Vaccination, Grooming or Surgery.'
    };
  }

  const details = buildDetails[recordType](body);

  for (const [field, message] of (REQUIRED[recordType] || [])) {
    const value = details[field];
    const missing = Array.isArray(value) ? value.length === 0 : !value;
    if (missing) return { ok: false, recordType, message };
  }

  return { ok: true, recordType, details };
};

module.exports = {
  normalizeRecordDetails,
  resolveRecordType,
  pickFrom,
  pickMany
};
