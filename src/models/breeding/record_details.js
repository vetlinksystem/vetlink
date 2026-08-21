// src/models/breeding/record_details.js
// Step 10: "The veterinarian records the crossbreed combination, breeding date,
// health observations, pregnancy monitoring schedule and offspring records."
//
// This is the clinic-side breeding record — the Sire/Dam form from the client's mockup.
// It is filled in by the veterinarian once the pair has passed final clearance, NOT at
// pet registration: putting sire and dam pickers on the owner's form would bypass the
// owner-consent step the flow requires. Sire and dam are therefore derived from the
// approved pair rather than chosen freely.
const firestoreManager = require('../../fb/firestore_manager');
const addNotification = require('../notifications/add');
const { now, getPet, systemMessageBetween } = require('./service');

const clean = (v) => String(v ?? '').trim();

const MATING_TYPES = ['natural', 'artificial_insemination'];
const BREEDING_PURPOSES = ['companion', 'working', 'show', 'guard', 'therapy', 'other'];

const num = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

const pickFrom = (list, v) => {
    const s = clean(v).toLowerCase().replace(/\s+/g, '_');
    return list.includes(s) ? s : '';
};

/**
 * Typical gestation, used to pre-fill the expected due date and the check-up schedule.
 * The clinic is dogs only — canine gestation is ~63 days. The cat entry is kept so a
 * breeding record opened against a pet registered before the dogs-only decision still
 * schedules sensible dates; 63 is the fallback for anything else.
 */
const GESTATION_DAYS = { dog: 63, cat: 64 };

const gestationFor = (species) => GESTATION_DAYS[String(species || '').toLowerCase()] || 63;

const addDays = (isoDate, days) => {
    const d = new Date(String(isoDate) + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

/**
 * Pregnancy monitoring schedule, counted from the breeding date.
 * The dates drive the check-up reminders sent to the owners.
 */
const buildMonitoringSchedule = (breedingDate, species) => {
    const term = gestationFor(species);
    const plan = [
        { key: 'pregnancy_confirmation', label: 'Pregnancy confirmation (ultrasound)', day: 25 },
        { key: 'mid_term_check',         label: 'Mid-term check-up',                   day: Math.round(term * 0.6) },
        { key: 'pre_whelping_check',     label: 'Pre-whelping / pre-queening check',   day: term - 7 },
        { key: 'expected_delivery',      label: 'Expected delivery',                   day: term },
        { key: 'post_delivery_check',    label: 'Post-delivery check-up',              day: term + 7 }
    ];

    return plan.map(step => ({
        ...step,
        dueDate: addDays(breedingDate, step.day),
        status: 'scheduled',   // scheduled | done | missed
        completedAt: null,
        notes: ''
    })).filter(s => !!s.dueDate);
};

/**
 * Save the breeding record for a cleared pair.
 *
 * @param {Object} employee  veterinarian
 * @param {Object} body      { id, breedingDate, matingType, place, studFee, numberOfMating,
 *                             breedingPurpose, estimatedLitterSize, healthObservations, notes }
 */
module.exports = async function saveBreedingRecord(employee, body) {
    const { id } = body || {};
    if (!id) return { success: false, message: 'Breeding id is required.' };

    const record = await firestoreManager.getData('breeding', String(id));
    if (!record) return { success: false, message: 'Breeding record not found.' };

    // The breeding record can only be entered after the final health examination.
    if (!['cleared', 'completed'].includes(String(record.status))) {
        return {
            success: false,
            message: String(record.status) === 'approved'
                ? 'Record the final health examination first — a breeding record can only be entered once both pets are cleared.'
                : `A breeding record can only be entered for a cleared breeding (this one is ${record.status}).`
        };
    }

    const breedingDate = clean(body.breedingDate);
    if (!breedingDate || Number.isNaN(new Date(breedingDate).getTime())) {
        return { success: false, message: 'A valid breeding date is required.' };
    }
    if (new Date(breedingDate) > new Date()) {
        return { success: false, message: 'The breeding date cannot be in the future.' };
    }

    const matingType = pickFrom(MATING_TYPES, body.matingType);
    if (!matingType) {
        return { success: false, message: 'Select the mating type (natural or artificial insemination).' };
    }

    const numberOfMating = num(body.numberOfMating);
    if (numberOfMating === null || numberOfMating < 1) {
        return { success: false, message: 'Enter the number of matings.' };
    }

    const [petA, petB] = await Promise.all([getPet(record.petAId), getPet(record.petBId)]);
    if (!petA || !petB) return { success: false, message: 'One or both pets could not be found.' };

    // Sire is the male, dam is the female — taken from the approved pair, never chosen.
    const sire = String(petA.sex || '').toLowerCase() === 'male' ? petA : petB;
    const dam = String(petA.sex || '').toLowerCase() === 'male' ? petB : petA;

    if (String(sire.sex || '').toLowerCase() !== 'male'
        || String(dam.sex || '').toLowerCase() !== 'female') {
        return { success: false, message: 'This pair does not have one male and one female recorded.' };
    }

    const species = dam.species || sire.species;
    const expectedDueDate = clean(body.expectedDueDate)
        || addDays(breedingDate, gestationFor(species));

    // Crossbreed when the two breeds differ, otherwise purebred.
    const isCrossbreed = clean(sire.breed).toLowerCase() !== clean(dam.breed).toLowerCase();

    const details = {
        // Sire / dam, derived from the approved pair
        sireId: sire.id,
        sireName: sire.name || sire.id,
        sireBreed: sire.breed || '',
        damId: dam.id,
        damName: dam.name || dam.id,
        damBreed: dam.breed || '',

        // The crossbreed combination, recorded as the document asks
        breedingType: isCrossbreed ? 'crossbreed' : 'purebred',
        combination: isCrossbreed
            ? `${sire.breed || 'Unknown'} × ${dam.breed || 'Unknown'}`
            : `${sire.breed || 'Unknown'} (purebred)`,
        species: species || '',

        breedingDate,
        matingType,
        place: clean(body.place),
        studFee: num(body.studFee),
        numberOfMating,
        breedingPurpose: pickFrom(BREEDING_PURPOSES, body.breedingPurpose)
            || record.breedingPurpose || '',
        estimatedLitterSize: clean(body.estimatedLitterSize),
        expectedDueDate,
        healthObservations: clean(body.healthObservations),
        notes: clean(body.notes),

        recordedBy: employee?.id || '',
        recordedByName: employee?.name || '',
        recordedAt: now()
    };

    // Pregnancy monitoring starts from the breeding date.
    const monitoring = {
        pregnancyStatus: 'unconfirmed',   // unconfirmed | confirmed | not_pregnant | delivered
        confirmedAt: null,
        expectedDueDate,
        gestationDays: gestationFor(species),
        schedule: buildMonitoringSchedule(breedingDate, species),
        updatedAt: now()
    };

    const ok = await firestoreManager.updatePartialData('breeding', {
        id: record.id,
        breedingDetails: details,
        monitoring,
        offspring: Array.isArray(record.offspring) ? record.offspring : []
    });
    if (!ok) return { success: false, message: 'Failed to save the breeding record.' };

    const owners = [record.ownerAId, record.ownerBId]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);

    const firstCheck = monitoring.schedule[0];

    for (const ownerId of owners) {
        addNotification({
            clientId: ownerId,
            type: 'breeding_update',
            title: 'Breeding recorded 📋',
            message: `The clinic recorded the breeding ${details.combination} on ${breedingDate}. `
                + `Expected due date: ${expectedDueDate}.`
                + (firstCheck ? ` First check: ${firstCheck.label} on ${firstCheck.dueDate}.` : ''),
            payload: { breedingRef: record.id, expectedDueDate }
        }).catch(() => {});
    }

    await systemMessageBetween(
        record.ownerAId, record.ownerBId,
        `The clinic recorded the breeding ${details.combination}. Expected due date: ${expectedDueDate}.`,
        { breedingRef: record.id }
    );

    return { success: true, id: record.id, breedingDetails: details, monitoring };
};

module.exports.MATING_TYPES = MATING_TYPES;
module.exports.GESTATION_DAYS = GESTATION_DAYS;
module.exports.buildMonitoringSchedule = buildMonitoringSchedule;
module.exports.gestationFor = gestationFor;
module.exports.addDays = addDays;
