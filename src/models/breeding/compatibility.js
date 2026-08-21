// src/models/breeding/compatibility.js
// Scores a potential breeding pair and estimates its risk.
//
// From the crossbreeding document, step 5 lists the criteria to evaluate:
//   Same species · Opposite sex · Health status · Age · Size compatibility ·
//   Temperament · Breed compatibility
// and step 7 says suggested matches must show a compatibility score, an estimated
// health risk (Low / Moderate / High) and a veterinary recommendation.
//
// The score is guidance only. Per the client's closing recommendation the
// veterinarian is the final decision-maker, so anything with elevated risk is
// flagged `requiresVetReview` and cannot skip the clinic's approval step.

const { STATUS, lookupPair, sizeGap } = require('../../utilities/breedCompatibility');
const { resolveSize, sizeRank } = require('../../utilities/breedCatalog');
const { checkBreedingAge, formatAge } = require('../../utilities/petUtils');

const RISK = { LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High' };

// Weights sum to 100. Species/sex are hard gates rather than scored components.
const WEIGHTS = {
  breed: 35,        // breed-pair status from the compatibility table
  size: 20,         // size compatibility
  age: 20,          // both within the ideal breeding window
  health: 15,       // veterinary clearance / recorded health
  temperament: 10   // recorded temperament, when known
};

const norm = (v) => String(v ?? '').trim().toLowerCase();

const OPPOSITE = { male: 'female', female: 'male' };

/**
 * Hard eligibility gates. If any fails the pair cannot be proposed at all.
 * Returns { ok, reason }.
 */
const checkEligibility = (petA, petB) => {
  if (!petA || !petB) return { ok: false, reason: 'One or both pets could not be found.' };

  if (String(petA.id) === String(petB.id)) {
    return { ok: false, reason: 'A pet cannot be bred with itself.' };
  }

  // Same species only. The clinic is dogs only, so this now exists to stop a pet
  // registered before that decision (a legacy cat) being paired with a dog.
  // A blank species is not treated as a mismatch — see candidates.js.
  const spA = norm(petA.species);
  const spB = norm(petB.species);
  if (spA && spB && spA !== spB) {
    return { ok: false, reason: `Pets must be the same species (${petA.species} × ${petB.species} is not possible).` };
  }

  // Opposite sex.
  const sexA = norm(petA.sex);
  const sexB = norm(petB.sex);
  if (!OPPOSITE[sexA] || !OPPOSITE[sexB]) {
    return { ok: false, reason: 'Both pets must have their sex recorded (Male or Female).' };
  }
  if (OPPOSITE[sexA] !== sexB) {
    return { ok: false, reason: 'Pets must be of opposite sex.' };
  }

  // Breed pair explicitly not allowed.
  const pair = lookupPair(petA.breed, petB.breed);
  if (pair.status === STATUS.NOT_ALLOWED) {
    return { ok: false, reason: pair.notes };
  }

  // Underage is an absolute block (past-prime is only a warning).
  const ageA = checkBreedingAge(petA);
  const ageB = checkBreedingAge(petB);
  if (ageA.status === 'too_young') return { ok: false, reason: ageA.message };
  if (ageB.status === 'too_young') return { ok: false, reason: ageB.message };

  return { ok: true };
};

// ===== Individual criteria =====

const scoreBreed = (petA, petB) => {
  const pair = lookupPair(petA.breed, petB.breed);
  let pct;
  if (pair.status === STATUS.COMPATIBLE) pct = 1;
  else if (pair.status === STATUS.REVIEW) pct = 0.45;
  else pct = 0;

  return {
    key: 'breed',
    label: 'Breed compatibility',
    points: Math.round(WEIGHTS.breed * pct),
    max: WEIGHTS.breed,
    status: pair.status,
    detail: pair.notes,
    flag: pair.status === STATUS.REVIEW ? pair.notes : null
  };
};

const scoreSize = (petA, petB) => {
  const gap = sizeGap(petA, petB);
  const known = sizeRank(resolveSize(petA)) && sizeRank(resolveSize(petB));

  let pct, detail, flag = null;
  if (!known) {
    pct = 0.5;
    detail = 'Size not recorded for one or both pets.';
    flag = 'Size is not recorded — the veterinarian should confirm the pair is physically suited.';
  } else if (gap === 0) {
    pct = 1;
    detail = `Both ${resolveSize(petA)} — well matched.`;
  } else if (gap === 1) {
    pct = 0.6;
    detail = `One size class apart (${resolveSize(petA)} × ${resolveSize(petB)}).`;
  } else {
    pct = 0.1;
    detail = `Extreme size difference (${resolveSize(petA)} × ${resolveSize(petB)}).`;
    flag = 'Large size difference increases pregnancy and delivery risk.';
  }

  // A big weight gap matters even inside the same size class.
  if (known && petA.weight && petB.weight) {
    const heavier = Math.max(petA.weight, petB.weight);
    const lighter = Math.min(petA.weight, petB.weight);
    const ratio = heavier / lighter;
    if (ratio >= 3) {
      pct = Math.min(pct, 0.15);
      detail += ` Weight ratio ${ratio.toFixed(1)}:1.`;
      flag = 'One pet is more than three times the weight of the other — delivery risk.';
    }
  }

  return {
    key: 'size',
    label: 'Size compatibility',
    points: Math.round(WEIGHTS.size * pct),
    max: WEIGHTS.size,
    detail,
    flag
  };
};

const scoreAge = (petA, petB) => {
  const a = checkBreedingAge(petA);
  const b = checkBreedingAge(petB);

  const rate = (c) => (c.status === 'ideal' ? 1 : c.status === 'past_prime' ? 0.4 : 0);
  const pct = (rate(a) + rate(b)) / 2;

  const parts = [];
  if (a.status === 'ideal' && b.status === 'ideal') parts.push('Both pets are within the ideal breeding age.');
  if (a.status === 'past_prime') parts.push(`${petA.name || 'Pet A'} is past the ideal breeding age (${formatAge(petA.ageMonths)}).`);
  if (b.status === 'past_prime') parts.push(`${petB.name || 'Pet B'} is past the ideal breeding age (${formatAge(petB.ageMonths)}).`);
  if (a.status === 'unknown' || b.status === 'unknown') parts.push('Age is missing for one or both pets.');

  const flag = (a.status === 'past_prime' || b.status === 'past_prime' || a.status === 'unknown' || b.status === 'unknown')
    ? parts.join(' ')
    : null;

  return {
    key: 'age',
    label: 'Breeding age',
    points: Math.round(WEIGHTS.age * pct),
    max: WEIGHTS.age,
    detail: parts.join(' ') || 'Both pets are within the ideal breeding age.',
    flag
  };
};

/**
 * Health is judged from the pets' recent medical records: a check-up in the last
 * 12 months counts as cleared. Without records the pair scores half and is flagged,
 * because the document requires veterinary health clearance before breeding.
 */
const scoreHealth = (petA, petB, healthInfo = {}) => {
  const a = healthInfo[String(petA.id)] || {};
  const b = healthInfo[String(petB.id)] || {};

  const rate = (h) => {
    if (h.clearedRecently) return 1;
    if (h.hasRecords) return 0.6;
    return 0.3;
  };
  const pct = (rate(a) + rate(b)) / 2;

  const missing = [];
  if (!a.clearedRecently) missing.push(petA.name || 'Pet A');
  if (!b.clearedRecently) missing.push(petB.name || 'Pet B');

  return {
    key: 'health',
    label: 'Health clearance',
    points: Math.round(WEIGHTS.health * pct),
    max: WEIGHTS.health,
    detail: missing.length
      ? `No check-up in the last 12 months for: ${missing.join(', ')}.`
      : 'Both pets have a recent veterinary check-up on record.',
    flag: missing.length
      ? `A pre-breeding health examination is required for ${missing.join(' and ')}.`
      : null
  };
};

/**
 * Temperament is not a structured field, so it is inferred from the owner's
 * description when present. Absent information scores neutral rather than badly.
 */
const scoreTemperament = (petA, petB) => {
  const AGGRESSIVE = /aggressiv|bite|bit(es|ing)|hostile|reactive|attack|fight/i;
  const GENTLE = /gentle|friendly|calm|sweet|docile|good.natured|affectionate|playful|well.behaved/i;

  const textOf = (p) => `${p.description || p.notes || ''}`;
  const rate = (p) => {
    const t = textOf(p);
    if (!t.trim()) return { pct: 0.5, note: 'no description' };
    if (AGGRESSIVE.test(t)) return { pct: 0, note: 'description mentions aggression' };
    if (GENTLE.test(t)) return { pct: 1, note: 'described as even-tempered' };
    return { pct: 0.6, note: 'temperament not clear from the description' };
  };

  const a = rate(petA);
  const b = rate(petB);
  const pct = (a.pct + b.pct) / 2;

  const concern = a.pct === 0 || b.pct === 0;

  return {
    key: 'temperament',
    label: 'Temperament',
    points: Math.round(WEIGHTS.temperament * pct),
    max: WEIGHTS.temperament,
    detail: `${petA.name || 'Pet A'}: ${a.note}; ${petB.name || 'Pet B'}: ${b.note}.`,
    flag: concern
      ? 'A description mentions aggression — the veterinarian should assess temperament before pairing.'
      : null
  };
};

/**
 * Full assessment of a pair.
 *
 * @param {Object} petA
 * @param {Object} petB
 * @param {Object} [healthInfo] map of petId -> { hasRecords, clearedRecently, lastCheckup }
 * @returns {Object} { eligible, reason, score, risk, requiresVetReview, breedStatus, flags[], breakdown[] }
 */
const assessPair = (petA, petB, healthInfo = {}) => {
  const eligibility = checkEligibility(petA, petB);
  if (!eligibility.ok) {
    return {
      eligible: false,
      reason: eligibility.reason,
      score: 0,
      risk: RISK.HIGH,
      requiresVetReview: true,
      breedStatus: STATUS.NOT_ALLOWED,
      flags: [eligibility.reason],
      breakdown: []
    };
  }

  const breakdown = [
    scoreBreed(petA, petB),
    scoreSize(petA, petB),
    scoreAge(petA, petB),
    scoreHealth(petA, petB, healthInfo),
    scoreTemperament(petA, petB)
  ];

  const score = breakdown.reduce((sum, c) => sum + c.points, 0);
  const flags = breakdown.map(c => c.flag).filter(Boolean);
  const breedStatus = breakdown[0].status;

  // Risk banding. A breed pair needing review, or any flag, cannot be "Low".
  let risk;
  if (score >= 85 && !flags.length) risk = RISK.LOW;
  else if (score >= 65) risk = RISK.MODERATE;
  else risk = RISK.HIGH;

  if (breedStatus === STATUS.REVIEW && risk === RISK.LOW) risk = RISK.MODERATE;

  // Every match needs clinic approval; this marks the ones that need extra scrutiny.
  const requiresVetReview = risk !== RISK.LOW || breedStatus === STATUS.REVIEW || flags.length > 0;

  return {
    eligible: true,
    reason: null,
    score,
    risk,
    requiresVetReview,
    breedStatus,
    flags,
    breakdown,
    recommendation: recommendationFor(risk, requiresVetReview)
  };
};

const recommendationFor = (risk, requiresVetReview) => {
  if (risk === RISK.LOW && !requiresVetReview) {
    return 'Good match — proceed to the owners\' consent step, then clinic approval.';
  }
  if (risk === RISK.MODERATE) {
    return 'Acceptable match, but the veterinarian should review the flagged points before approving.';
  }
  return 'High risk — veterinary assessment required. The pairing may be declined or approved with conditions.';
};

/**
 * Build the healthInfo map used by scoreHealth from the records collection.
 * A check-up (any type) within the last 12 months counts as recent clearance.
 */
const buildHealthInfo = (records, petIds) => {
  const wanted = new Set((petIds || []).map(String));
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const info = {};
  (records || []).forEach(r => {
    const pid = String(r?.petId || '');
    if (!pid || (wanted.size && !wanted.has(pid))) return;

    const date = String(r.date || r.createdAt || '').slice(0, 10);
    const cur = info[pid] || { hasRecords: false, clearedRecently: false, lastCheckup: null };
    cur.hasRecords = true;

    const isExam = ['checkup', 'general_checkup'].includes(String(r.recordType || ''))
      || /check.?up/i.test(String(r.type || ''));

    if (isExam && date && (!cur.lastCheckup || date > cur.lastCheckup)) cur.lastCheckup = date;
    if (isExam && date >= cutoffStr) cur.clearedRecently = true;

    info[pid] = cur;
  });

  return info;
};

module.exports = {
  RISK,
  WEIGHTS,
  checkEligibility,
  assessPair,
  buildHealthInfo,
  recommendationFor
};
