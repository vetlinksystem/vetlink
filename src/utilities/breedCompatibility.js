// src/utilities/breedCompatibility.js
// The Breed Compatibility Table the client asked for, plus the size-gap rule.
//
// From the crossbreeding document:
//   Labrador      × Golden Retriever  → Compatible       (low risk)
//   Poodle        × Labrador          → Compatible       (popular cross)
//   German Shepherd × Belgian Malinois → Compatible      (working breeds)
//   Chihuahua     × Great Dane        → Veterinary Review (significant size difference)
//   Dog           × Cat               → Not Allowed       (different species)
//
// SCOPE: the clinic is dogs only, so every pair in the table below is dog × dog.
// The Dog × Cat row is kept because the client's table lists it and because pets
// registered before the dogs-only decision may still carry a non-dog species —
// the rule stops a legacy cat being paired with a dog.
//
// Statuses, in increasing severity:
//   'compatible'       — safe cross, may proceed to the owners' consent step
//   'veterinary_review'— allowed to be proposed, but a vet MUST assess the risk
//   'not_allowed'      — cannot be proposed at all
//
// CROSSBREEDING IS ALLOWED. A cross between two different dog breeds is never
// refused on the grounds of being a cross — it is either listed as compatible or
// sent to the vet. What still forces review is a concrete risk: an extreme size
// gap, a brachycephalic parent, or a known hereditary condition.
//
// Anything not listed defaults to 'veterinary_review' rather than 'compatible':
// the clinic's closing recommendation is that the veterinarian is the final
// decision-maker, so an unknown pairing should never auto-approve itself.

const { sizeRank, resolveSize, speciesForBreed } = require('./breedCatalog');

const STATUS = {
  COMPATIBLE: 'compatible',
  REVIEW: 'veterinary_review',
  NOT_ALLOWED: 'not_allowed'
};

const norm = (v) => String(v ?? '').trim().toLowerCase();

// Unordered pair key so "A|B" and "B|A" are the same entry.
const pairKey = (a, b) => [norm(a), norm(b)].sort().join('|');

const entry = (a, b, status, notes) => [pairKey(a, b), { status, notes, breedA: a, breedB: b }];

const PAIRS = new Map([
  // ===== From the client's table =====
  entry('Labrador Retriever', 'Golden Retriever', STATUS.COMPATIBLE, 'Low risk — similar size and temperament.'),
  entry('Poodle', 'Labrador Retriever', STATUS.COMPATIBLE, 'Popular cross (Labradoodle).'),
  entry('German Shepherd', 'Belgian Malinois', STATUS.COMPATIBLE, 'Working breeds, closely matched.'),
  entry('Chihuahua', 'Great Dane', STATUS.REVIEW, 'Significant size difference — pregnancy and delivery risk.'),

  // ===== Additional well-established crosses =====
  entry('Poodle', 'Golden Retriever', STATUS.COMPATIBLE, 'Popular cross (Goldendoodle).'),
  entry('Poodle', 'Shih Tzu', STATUS.COMPATIBLE, 'Popular small cross (Shihpoo).'),
  entry('Poodle', 'Beagle', STATUS.COMPATIBLE, 'Comparable size.'),
  entry('Labrador Retriever', 'German Shepherd', STATUS.COMPATIBLE, 'Similar size, both robust.'),
  entry('Golden Retriever', 'Siberian Husky', STATUS.COMPATIBLE, 'Comparable size.'),
  entry('Beagle', 'Dachshund', STATUS.COMPATIBLE, 'Comparable size.'),
  entry('Aspin', 'Aspin', STATUS.COMPATIBLE, 'Native breed, robust.'),

  // ===== Pairs the vet should always look at =====
  // Brachycephalic pairings carry real breathing/delivery risk, so they are never
  // "compatible" outright — the note alone would not have reached the vet.
  entry('Bulldog', 'Bulldog', STATUS.REVIEW, 'Brachycephalic breed — elevated delivery risk, caesarean often required.'),
  entry('French Bulldog', 'French Bulldog', STATUS.REVIEW, 'Brachycephalic and narrow-hipped — caesarean commonly required.'),
  entry('Pug', 'Pug', STATUS.REVIEW, 'Brachycephalic breed — elevated anaesthetic and delivery risk.'),
  entry('Dachshund', 'Dachshund', STATUS.REVIEW, 'Hereditary intervertebral disc disease risk in offspring.'),
  entry('Chow Chow', 'Chow Chow', STATUS.REVIEW, 'Moderately brachycephalic, with hereditary hip dysplasia and entropion risk in offspring.'),
  entry('Great Dane', 'Saint Bernard', STATUS.REVIEW, 'Giant breeds — hip dysplasia and bloat risk in offspring.'),
  entry('Chihuahua', 'Labrador Retriever', STATUS.REVIEW, 'Large size difference — delivery risk.'),
  entry('Chihuahua', 'German Shepherd', STATUS.REVIEW, 'Large size difference — delivery risk.'),
  entry('Shih Tzu', 'Great Dane', STATUS.REVIEW, 'Extreme size difference — delivery risk.')
]);

/**
 * Look up a breed pair. Returns { status, notes, source }.
 * `source` says whether this came from the table, the size rule, the species rule,
 * or the default — useful for explaining the result to the vet.
 */
const lookupPair = (breedA, breedB) => {
  // 1. Different species is never allowed (Dog × Cat).
  const spA = speciesForBreed(breedA);
  const spB = speciesForBreed(breedB);
  if (spA && spB && norm(spA) !== norm(spB)) {
    return {
      status: STATUS.NOT_ALLOWED,
      notes: `Different species (${spA} × ${spB}) — cross-species breeding is not possible.`,
      source: 'species'
    };
  }

  // 2. Explicit table entry.
  const hit = PAIRS.get(pairKey(breedA, breedB));
  if (hit) return { status: hit.status, notes: hit.notes, source: 'table' };

  // 3. Same breed, not otherwise listed → a straightforward purebred pairing.
  if (norm(breedA) === norm(breedB) && norm(breedA)) {
    return {
      status: STATUS.COMPATIBLE,
      notes: 'Same breed — standard purebred pairing.',
      source: 'same_breed'
    };
  }

  // 4. Size gap rule: two steps apart (small × large) always needs a vet.
  const gap = sizeGap({ breed: breedA }, { breed: breedB });
  if (gap >= 2) {
    return {
      status: STATUS.REVIEW,
      notes: 'Extreme size difference between the breeds — pregnancy and delivery risk.',
      source: 'size'
    };
  }

  // 5. Unlisted cross — the veterinarian decides.
  return {
    status: STATUS.REVIEW,
    notes: 'This cross is not in the clinic\'s compatibility table — veterinary assessment required.',
    source: 'default'
  };
};

/**
 * Difference in size class between two pets (0 = same, 2 = small vs large).
 * Uses the pet's own size when set, else the breed default.
 */
const sizeGap = (petA, petB) => {
  const a = sizeRank(resolveSize(petA));
  const b = sizeRank(resolveSize(petB));
  if (!a || !b) return 0; // unknown size — can't judge, handled elsewhere
  return Math.abs(a - b);
};

/**
 * Cross-species rows. Enforced by the species check in checkEligibility() (which reads
 * the pet's stored species) rather than by breed lookup — the catalog is dogs only, so
 * a legacy cat's breed no longer resolves to a species here.
 *
 * The client's table lists "Dog × Cat → Not Allowed" explicitly, so the row is kept for
 * the displayed/printed reference table.
 */
const SPECIES_RULES = [
  { breedA: 'Dog', breedB: 'Cat', status: STATUS.NOT_ALLOWED, notes: 'Different species.', speciesRule: true }
];

/** All table rows, for the admin/vet reference screen. */
const allPairs = ({ includeSpeciesRules = true } = {}) => {
  const rows = [...PAIRS.values()]
    .map(v => ({ breedA: v.breedA, breedB: v.breedB, status: v.status, notes: v.notes }))
    .sort((x, y) => x.breedA.localeCompare(y.breedA) || x.breedB.localeCompare(y.breedB));

  return includeSpeciesRules ? [...rows, ...SPECIES_RULES] : rows;
};

module.exports = { STATUS, lookupPair, sizeGap, allPairs, pairKey, SPECIES_RULES };
