// src/utilities/petUtils.js
// Shared pet field normalization: age in months, the ideal breeding age window,
// duplicate detection, and the breeding-type fields.

const { resolveSpecies, resolveSize, SIZES } = require('./breedCatalog');

const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

// ===== Ideal breeding age (from the client's pet-registration notes) =====
// Female: 18 to 24 months · Male: 12 to 15 months
const BREEDING_AGE = {
  female: { min: 18, max: 24 },
  male:   { min: 12, max: 15 }
};

const SEXES = ['male', 'female'];
const BREEDING_TYPES = ['purebred', 'crossbreed'];
const BREEDING_PURPOSES = ['companion', 'working', 'show', 'guard', 'therapy', 'other'];

/**
 * Age is captured in months so the breeding window can be checked precisely.
 * Legacy documents only stored whole years, so `age` (years) is kept in sync
 * alongside `ageMonths` and either can be supplied.
 */
const normalizeAge = ({ ageMonths, age, dateOfBirth } = {}) => {
  // 1. Explicit months win.
  let months = null;
  if (ageMonths !== undefined && ageMonths !== null && ageMonths !== '') {
    const n = Number(ageMonths);
    if (Number.isFinite(n) && n >= 0) months = Math.round(n);
  }

  // 2. Otherwise derive from a date of birth.
  if (months === null && dateOfBirth) {
    const dob = new Date(dateOfBirth);
    if (!Number.isNaN(dob.getTime()) && dob <= new Date()) {
      const now = new Date();
      months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
      if (now.getDate() < dob.getDate()) months -= 1;
      if (months < 0) months = 0;
    }
  }

  // 3. Fall back to legacy whole years.
  if (months === null && age !== undefined && age !== null && age !== '') {
    const y = Number(age);
    if (Number.isFinite(y) && y >= 0) months = Math.round(y * 12);
  }

  if (months === null) return { ageMonths: null, age: null };

  return {
    ageMonths: months,
    age: Math.floor(months / 12) // legacy years field, kept in sync
  };
};

/** "2 yrs 4 mos" / "8 mos" — for display. */
const formatAge = (ageMonths) => {
  if (ageMonths === null || ageMonths === undefined) return '';
  const m = Number(ageMonths);
  if (!Number.isFinite(m)) return '';
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years && months) return `${years} yr${years > 1 ? 's' : ''} ${months} mo${months > 1 ? 's' : ''}`;
  if (years) return `${years} yr${years > 1 ? 's' : ''}`;
  return `${months} mo${months === 1 ? '' : 's'}`;
};

/**
 * Is this pet within the ideal breeding age window for its sex?
 * Returns { ok, status: 'ideal'|'too_young'|'past_prime'|'unknown', message, window }.
 *
 * "past_prime" is a warning, not a hard block — a vet may still clear an older animal.
 * "too_young" is a hard block: breeding an underage animal is never appropriate.
 */
const checkBreedingAge = (pet = {}) => {
  const sex = clean(pet.sex).toLowerCase();
  const window = BREEDING_AGE[sex];
  const months = pet.ageMonths === null || pet.ageMonths === undefined
    ? normalizeAge(pet).ageMonths
    : Number(pet.ageMonths);

  if (!window) {
    return { ok: false, status: 'unknown', window: null,
      message: "Set this pet's sex (Male/Female) before enabling breeding." };
  }
  if (months === null || !Number.isFinite(months)) {
    return { ok: false, status: 'unknown', window,
      message: "Set this pet's age before enabling breeding." };
  }

  if (months < window.min) {
    return {
      ok: false, status: 'too_young', window,
      message: `${pet.name || 'This pet'} is ${formatAge(months)} old. The ideal breeding age for a ${sex} is ${window.min}–${window.max} months, so it is too young for breeding.`
    };
  }
  if (months > window.max) {
    return {
      ok: true, status: 'past_prime', window,
      message: `${pet.name || 'This pet'} is ${formatAge(months)} old, past the ideal breeding age for a ${sex} (${window.min}–${window.max} months). A veterinarian should review this pairing.`
    };
  }
  return {
    ok: true, status: 'ideal', window,
    message: `Within the ideal breeding age for a ${sex} (${window.min}–${window.max} months).`
  };
};

/**
 * Normalize the fields the pet form now submits.
 * Species is derived from the breed — the form no longer asks for it.
 */
const normalizePetFields = (body = {}, existing = {}) => {
  const name = clean(body.name ?? existing.name);
  const breed = clean(body.breed ?? existing.breed);
  const sex = clean(body.sex ?? existing.sex);

  // Description replaced the old free-text "notes" field and is now required.
  const description = clean(body.description ?? body.notes ?? existing.description ?? existing.notes);

  const sizeRaw = clean(body.size ?? existing.size).toLowerCase();
  const size = SIZES.includes(sizeRaw) ? sizeRaw : resolveSize({ breed, size: sizeRaw });

  let weight = null;
  const weightRaw = body.weight ?? existing.weight;
  if (weightRaw !== undefined && weightRaw !== null && weightRaw !== '') {
    const w = Number(weightRaw);
    if (Number.isFinite(w) && w > 0) weight = Math.round(w * 100) / 100;
  }

  const { ageMonths, age } = normalizeAge({
    ageMonths: body.ageMonths ?? existing.ageMonths,
    age: body.age ?? existing.age,
    dateOfBirth: body.dateOfBirth ?? existing.dateOfBirth
  });

  const breedingAllowed = body.breedingAllowed !== undefined
    ? !!body.breedingAllowed
    : (body.allowBreeding !== undefined ? !!body.allowBreeding : !!existing.breedingAllowed);

  const breedingTypeRaw = clean(body.breedingType ?? existing.breedingType).toLowerCase();
  const breedingType = BREEDING_TYPES.includes(breedingTypeRaw) ? breedingTypeRaw : '';

  const breedingPurposeRaw = clean(body.breedingPurpose ?? existing.breedingPurpose).toLowerCase();
  const breedingPurpose = BREEDING_PURPOSES.includes(breedingPurposeRaw) ? breedingPurposeRaw : '';

  const preferredSizeRaw = clean(body.preferredSize ?? existing.preferredSize).toLowerCase();
  const preferredSize = SIZES.includes(preferredSizeRaw) ? preferredSizeRaw : '';

  return {
    name,
    breed,
    // Derived, not asked for. Falls back to anything already stored on the pet.
    species: resolveSpecies(breed, body.species ?? existing.species),
    sex,
    size,
    weight,
    ageMonths,
    age,
    dateOfBirth: clean(body.dateOfBirth ?? existing.dateOfBirth),
    description,
    notes: description, // legacy alias so older readers keep working
    breedingAllowed,
    breedingType,
    breedingPurpose,
    preferredSize
  };
};

/**
 * Validate a pet payload. Sex and Description are now required (they used to be optional).
 */
const validatePet = (fields = {}) => {
  if (!fields.name) return { ok: false, message: 'Pet name is required.' };
  if (!fields.breed) return { ok: false, message: 'Breed is required.' };
  if (!SEXES.includes(clean(fields.sex).toLowerCase())) {
    return { ok: false, message: 'Please select the pet\'s sex (Male or Female).' };
  }
  if (!fields.size) return { ok: false, message: 'Please select the pet\'s size (Small, Medium or Large).' };
  if (fields.weight === null) return { ok: false, message: 'Please enter the pet\'s weight in kilograms.' };
  if (fields.ageMonths === null) return { ok: false, message: 'Please enter the pet\'s age.' };
  if (!fields.description) {
    return { ok: false, message: 'Please describe your pet (colour, markings, personality, etc.).' };
  }

  if (fields.breedingAllowed) {
    if (!BREEDING_TYPES.includes(fields.breedingType)) {
      return { ok: false, message: 'Choose a breeding type: Purebred or Crossbreed.' };
    }
    // Crossbreeding asks for the owner's intent so matches can be ranked against it.
    if (fields.breedingType === 'crossbreed' && !fields.breedingPurpose) {
      return { ok: false, message: 'Choose the purpose of breeding (companion, working, show, etc.).' };
    }

    const ageCheck = checkBreedingAge(fields);
    if (!ageCheck.ok) return { ok: false, message: ageCheck.message };
  }

  return { ok: true };
};

/**
 * Identity used to reject duplicate pet registrations. The clinic reported the same
 * pet being registered repeatedly with identical details.
 */
const duplicateKey = (pet = {}) =>
  [
    clean(pet.ownerId).toLowerCase(),
    clean(pet.name).toLowerCase(),
    clean(pet.breed).toLowerCase(),
    clean(pet.sex).toLowerCase()
  ].join('|');

/**
 * Does an identical pet already exist for this owner?
 * `ignoreId` lets an update skip the record being edited.
 */
const findDuplicate = (existingPets, candidate, ignoreId = null) => {
  const key = duplicateKey(candidate);
  return (existingPets || []).find(p =>
    (!ignoreId || String(p.id) !== String(ignoreId)) &&
    duplicateKey({ ...p, ownerId: p.ownerId }) === key
  ) || null;
};

module.exports = {
  BREEDING_AGE,
  SEXES,
  SIZES,
  BREEDING_TYPES,
  BREEDING_PURPOSES,
  clean,
  normalizeAge,
  formatAge,
  checkBreedingAge,
  normalizePetFields,
  validatePet,
  duplicateKey,
  findDuplicate
};
