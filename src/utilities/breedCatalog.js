// src/utilities/breedCatalog.js
// Single source of truth for breeds, their species, and their size class.
//
// SCOPE: this clinic is DOGS ONLY. Every breed below is a dog, and `species` is
// always 'Dog'. The field is kept rather than deleted for two reasons:
//   1. Pet documents already in Firestore from before the dogs-only decision may
//      carry 'Cat' / 'Rabbit' / etc. Keeping the field lets the breeding rules
//      still refuse to pair a legacy cat with a dog.
//   2. Removing it would mean touching every read path for no functional gain.
//
// Why the field is derived rather than asked for: the client docs asked for the
// Species input to be removed from the registration form, so the server fills it in
// from the selected breed instead of asking the owner twice.
//
// Size class feeds the crossbreed compatibility check, where a large size gap
// between sire and dam raises pregnancy/delivery risk and forces veterinary review.

const SIZES = ['small', 'medium', 'large'];

// The only species this clinic registers. Unknown/free-text breeds resolve to this.
const DEFAULT_SPECIES = 'Dog';

// breed -> { species, size }
const BREEDS = {
  // ===== Dogs =====
  'aspin':               { species: 'Dog', size: 'medium' },
  'shih tzu':            { species: 'Dog', size: 'small'  },
  'chihuahua':           { species: 'Dog', size: 'small'  },
  'pomeranian':          { species: 'Dog', size: 'small'  },
  'dachshund':           { species: 'Dog', size: 'small'  },
  'pug':                 { species: 'Dog', size: 'small'  },
  'toy poodle':          { species: 'Dog', size: 'small'  },
  'poodle':              { species: 'Dog', size: 'medium' },
  'beagle':              { species: 'Dog', size: 'medium' },
  'bulldog':             { species: 'Dog', size: 'medium' },
  'french bulldog':      { species: 'Dog', size: 'small'  },
  'cocker spaniel':      { species: 'Dog', size: 'medium' },
  'border collie':       { species: 'Dog', size: 'medium' },
  'chow chow':           { species: 'Dog', size: 'large'  },
  'siberian husky':      { species: 'Dog', size: 'large'  },
  'labrador retriever':  { species: 'Dog', size: 'large'  },
  'golden retriever':    { species: 'Dog', size: 'large'  },
  'german shepherd':     { species: 'Dog', size: 'large'  },
  'belgian malinois':    { species: 'Dog', size: 'large'  },
  'rottweiler':          { species: 'Dog', size: 'large'  },
  'doberman':            { species: 'Dog', size: 'large'  },
  'great dane':          { species: 'Dog', size: 'large'  },
  'saint bernard':       { species: 'Dog', size: 'large'  }
};

const norm = (v) => String(v ?? '').trim().toLowerCase();

/**
 * Species for a breed, or '' when the breed is unknown (e.g. "Other", free text).
 * Every known breed is a dog, so this returns 'Dog' or ''.
 */
const speciesForBreed = (breed) => {
  const entry = BREEDS[norm(breed)];
  return entry ? entry.species : '';
};

/**
 * Species class for a breed, used on save so `species` stays populated even though
 * the form no longer asks for it.
 *
 * Order matters: a known breed wins, then whatever the caller already had (which
 * preserves 'Cat' on legacy pets registered before the dogs-only decision), and
 * finally 'Dog' — because a free-text breed entered today can only be a dog.
 */
const resolveSpecies = (breed, fallback = '') => {
  return speciesForBreed(breed) || String(fallback || '').trim() || DEFAULT_SPECIES;
};

/**
 * Suggested size class for a breed ('' when unknown). The owner can still override it —
 * the form asks for size explicitly — this is only the default.
 */
const sizeForBreed = (breed) => {
  const entry = BREEDS[norm(breed)];
  return entry ? entry.size : '';
};

/**
 * Effective size for a pet: what the owner selected, else the breed default.
 */
const resolveSize = (pet = {}) => {
  const explicit = norm(pet.size);
  if (SIZES.includes(explicit)) return explicit;
  return sizeForBreed(pet.breed) || '';
};

/** Numeric rank so a size gap can be measured (small=1, medium=2, large=3). */
const sizeRank = (size) => {
  const i = SIZES.indexOf(norm(size));
  return i === -1 ? 0 : i + 1;
};

/** All breeds for a species, title-cased for display, plus "Other". */
const breedsForSpecies = (species) => {
  const s = norm(species);
  const list = Object.entries(BREEDS)
    .filter(([, v]) => norm(v.species) === s)
    .map(([k]) => k.replace(/\b\w/g, (c) => c.toUpperCase()))
    .sort();
  return [...list, 'Other'];
};

/** Every known breed, title-cased. Used by the "breed" dropdown now that species is hidden. */
const allBreeds = () =>
  Object.keys(BREEDS)
    .map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase()))
    .sort();

const SPECIES_LIST = [...new Set(Object.values(BREEDS).map((v) => v.species))].sort();

/** True when a pet is something this clinic no longer registers (a legacy cat, etc.). */
const isLegacySpecies = (species) => {
  const s = norm(species);
  return !!s && s !== norm(DEFAULT_SPECIES);
};

module.exports = {
  SIZES,
  DEFAULT_SPECIES,
  SPECIES_LIST,
  isLegacySpecies,
  BREEDS,
  speciesForBreed,
  resolveSpecies,
  sizeForBreed,
  resolveSize,
  sizeRank,
  breedsForSpecies,
  allBreeds
};
