// src/routers/catalogs.js
// Read-only reference data shared by every front-end (web client, web employee, Android):
// the breed catalog (which also carries species + size class), the clinical vocabularies
// used by the medical-record forms, and the breeding rules.
//
// Serving these from one place stops the option lists drifting apart between the
// Android app and the two web UIs, which is exactly what happened with breeds before.
const express = require('express');
const router = express.Router();

const breedCatalog = require('../utilities/breedCatalog');
const catalogs = require('../utilities/catalogs');
const {
  BREEDING_AGE,
  BREEDING_TYPES,
  BREEDING_PURPOSES,
  SIZES
} = require('../utilities/petUtils');

// GET /catalogs/breeds  → [{ breed, species, size }]
router.get('/breeds', (req, res) => {
  const species = req.query.species;
  const rows = Object.entries(breedCatalog.BREEDS)
    .map(([breed, v]) => ({
      breed: breed.replace(/\b\w/g, (c) => c.toUpperCase()),
      species: v.species,
      size: v.size
    }))
    .filter(r => !species || String(r.species).toLowerCase() === String(species).toLowerCase())
    .sort((a, b) => a.breed.localeCompare(b.breed));

  return res.json({ success: true, breeds: rows, species: breedCatalog.SPECIES_LIST });
});

// GET /catalogs/pet-options → everything the Add/Edit Pet form needs
router.get('/pet-options', (req, res) => {
  return res.json({
    success: true,
    sizes: SIZES,
    sexes: ['Male', 'Female'],
    breedingTypes: BREEDING_TYPES,
    breedingPurposes: BREEDING_PURPOSES,
    // Ideal breeding age in months — Female 18–24, Male 12–15
    breedingAge: BREEDING_AGE,
    breeds: breedCatalog.allBreeds()
  });
});

// GET /catalogs/medical → clinical vocabularies for the medical-record forms
router.get('/medical', (req, res) => {
  return res.json({ success: true, ...catalogs.medicalCatalogs() });
});

// GET /catalogs/breed-compatibility → the Breed Compatibility Table
// Reference data for the clinic: which crosses are compatible, which need a
// veterinary review, and which are not allowed.
router.get('/breed-compatibility', (req, res) => {
  const { allPairs, STATUS } = require('../utilities/breedCompatibility');
  return res.json({ success: true, statuses: STATUS, pairs: allPairs() });
});

// GET /catalogs/breeding-rules → how the compatibility score is composed
router.get('/breeding-rules', (req, res) => {
  const { WEIGHTS, RISK } = require('../models/breeding/compatibility');
  return res.json({
    success: true,
    weights: WEIGHTS,
    riskLevels: RISK,
    breedingAge: BREEDING_AGE,
    note: 'Scores are guidance only. The veterinarian is the final decision-maker; '
        + 'any pairing with elevated risk requires veterinary approval before breeding.'
  });
});

module.exports = router;