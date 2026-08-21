// src/utilities/catalogs.js
// Controlled vocabularies for the medical-record forms, taken from the clinic's
// revision notes. Keeping them here (rather than hard-coded in each HTML page and in
// the Android layouts) means the option lists cannot drift apart between clients.

// Record types the clinic keeps. Each maps to its own form.
const RECORD_TYPES = [
  { key: 'checkup',         label: 'Check Up' },
  { key: 'general_checkup', label: 'General Check Up' },
  { key: 'vaccination',     label: 'Vaccination' },
  { key: 'grooming',        label: 'Grooming' },
  { key: 'surgery',         label: 'Surgery' }
];

// --- Surgery / Procedure ---
const SURGERY_PROCEDURES = [
  'Gastrointestinal Foreign Body Removal',
  'Dental Extractions',
  'Benign Skin Mass Removal',
  'Wound and Laceration Repair',
  'Spay (Ovariohysterectomy)',
  'Neuter (Castration)',
  'Caesarean Section',
  'Other'
];

// --- Anaesthesia used during a procedure (multi-select) ---
const ANESTHESIA_TYPES = [
  'Dexmedetomidine',
  'Acepromazine',
  'Midazolam',
  'Isoflurane',
  'Sevoflurane'
];

// --- Vaccines ---
const VACCINE_TYPES = [
  'DAPP / DHPP',
  'DHLPP',
  'DHPPi/L4',
  'Anti-Rabies',
  'Bordetella',
  'Leptospirosis',
  'Feline 3-in-1 (FVRCP)',
  'Feline 4-in-1',
  'Other'
];

const VACCINE_ROUTES = [
  'Subcutaneous',
  'Intramuscular',
  'Intranasal',
  'Oral'
];

// --- Grooming services (multi-select) ---
const GROOMING_TYPES = [
  'Bathing',
  'Brushing',
  'Haircuts',
  'Nail Trimming',
  'Ear Cleaning',
  'Teeth Brushing'
];

// --- General check-up screening ---
const BODY_CONDITIONS = ['Underweight', 'Ideal', 'Overweight', 'Obese'];
const HYDRATION_STATUSES = ['Normal', 'Mild dehydration', 'Moderate dehydration', 'Severe dehydration'];
const SCREENING_RESULTS = ['Normal', 'Mild finding', 'Abnormal', 'Not assessed'];

// Body systems assessed on a general check-up (each uses SCREENING_RESULTS)
const SCREENING_AREAS = [
  'Eyes',
  'Ears',
  'Nose',
  'Mouth / Teeth',
  'Skin & Coat',
  'Respiratory',
  'Digestive',
  'Musculoskeletal'
];

const OVERALL_ASSESSMENTS = ['Excellent', 'Good', 'Fair', 'Poor'];

// --- Check-up reason for visit ---
const VISIT_REASONS = [
  'Routine check-up',
  'Vaccination',
  'Follow-up',
  'Illness',
  'Injury',
  'Skin problem',
  'Digestive problem',
  'Pre-breeding examination',
  'Pregnancy monitoring',
  'Other'
];

// --- Surgery outcome ---
const SURGERY_OUTCOMES = [
  'Successful',
  'Successful with complications',
  'Aborted',
  'Referred'
];

/**
 * Everything the medical-record forms need, in one payload.
 */
const medicalCatalogs = () => ({
  recordTypes: RECORD_TYPES,
  surgeryProcedures: SURGERY_PROCEDURES,
  anesthesiaTypes: ANESTHESIA_TYPES,
  vaccineTypes: VACCINE_TYPES,
  vaccineRoutes: VACCINE_ROUTES,
  groomingTypes: GROOMING_TYPES,
  bodyConditions: BODY_CONDITIONS,
  hydrationStatuses: HYDRATION_STATUSES,
  screeningResults: SCREENING_RESULTS,
  screeningAreas: SCREENING_AREAS,
  overallAssessments: OVERALL_ASSESSMENTS,
  visitReasons: VISIT_REASONS,
  surgeryOutcomes: SURGERY_OUTCOMES
});

const RECORD_TYPE_KEYS = RECORD_TYPES.map(t => t.key);

module.exports = {
  RECORD_TYPES,
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
  SURGERY_OUTCOMES,
  medicalCatalogs
};
