// src/models/breeding/pregnancy.js
// Post-breeding care: "Veterinary follow-up for pregnancy monitoring, health tracking
// for both pets, system reminders for check-ups" plus offspring records.
//
// The monitoring schedule is created with the breeding record (record_details.js).
// This module updates the pregnancy status, marks scheduled check-ups as done, records
// offspring, and closes the breeding out.
const firestoreManager = require('../../fb/firestore_manager');
const addNotification = require('../notifications/add');
const { now, getPet, systemMessageBetween } = require('./service');
const { addDays, gestationFor } = require('./record_details');

const clean = (v) => String(v ?? '').trim();

const PREGNANCY_STATUSES = ['unconfirmed', 'confirmed', 'not_pregnant', 'delivered'];

const ownersOf = (record) =>
    [record.ownerAId, record.ownerBId]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);

const notifyOwners = (record, { title, message, payload = {} }) => {
    ownersOf(record).forEach(ownerId => {
        addNotification({ clientId: ownerId, type: 'breeding_update', title, message, payload })
            .catch(() => {});
    });
};

/**
 * Update the pregnancy status and/or tick off a scheduled check-up.
 *
 * @param {Object} employee
 * @param {Object} body { id, pregnancyStatus?, confirmedDate?, stepKey?, stepStatus?, stepNotes?, notes? }
 */
const updatePregnancy = async (employee, body) => {
    const { id } = body || {};
    if (!id) return { success: false, message: 'Breeding id is required.' };

    const record = await firestoreManager.getData('breeding', String(id));
    if (!record) return { success: false, message: 'Breeding record not found.' };

    if (!record.breedingDetails) {
        return { success: false, message: 'Record the breeding first — there is nothing to monitor yet.' };
    }

    const monitoring = {
        pregnancyStatus: 'unconfirmed',
        schedule: [],
        ...(record.monitoring || {})
    };

    // --- Pregnancy status ---
    if (body.pregnancyStatus !== undefined) {
        const status = clean(body.pregnancyStatus).toLowerCase();
        if (!PREGNANCY_STATUSES.includes(status)) {
            return {
                success: false,
                message: `Pregnancy status must be one of: ${PREGNANCY_STATUSES.join(', ')}.`
            };
        }

        const previous = monitoring.pregnancyStatus;
        monitoring.pregnancyStatus = status;

        if (status === 'confirmed') {
            monitoring.confirmedAt = clean(body.confirmedDate) || now().slice(0, 10);
            // Re-anchor the due date on the confirmation if the vet supplied a date.
            if (clean(body.expectedDueDate)) monitoring.expectedDueDate = clean(body.expectedDueDate);
        }
        if (status === 'delivered') {
            monitoring.deliveredAt = clean(body.deliveredDate) || now().slice(0, 10);
        }

        if (status !== previous) {
            const messages = {
                confirmed: 'Pregnancy confirmed 🎉',
                not_pregnant: 'Pregnancy not confirmed',
                delivered: 'Delivery recorded 🐾',
                unconfirmed: 'Pregnancy status updated'
            };
            const bodies = {
                confirmed: `Pregnancy confirmed for ${record.breedingDetails.damName}. `
                    + `Expected due date: ${monitoring.expectedDueDate || 'to be confirmed'}. `
                    + 'Monitoring check-ups will be reminded automatically.',
                not_pregnant: `The pregnancy for ${record.breedingDetails.damName} was not confirmed. `
                    + 'Please speak with the clinic about next steps.',
                delivered: `Delivery recorded for ${record.breedingDetails.damName}. `
                    + 'A post-delivery check-up is recommended.',
                unconfirmed: `The pregnancy status for ${record.breedingDetails.damName} was updated.`
            };
            notifyOwners(record, {
                title: messages[status],
                message: bodies[status],
                payload: { breedingRef: record.id, pregnancyStatus: status }
            });
        }
    }

    // --- Tick off a scheduled check-up ---
    if (body.stepKey) {
        const key = clean(body.stepKey);
        const stepStatus = clean(body.stepStatus).toLowerCase() || 'done';
        if (!['scheduled', 'done', 'missed'].includes(stepStatus)) {
            return { success: false, message: 'Step status must be scheduled, done or missed.' };
        }

        const idx = (monitoring.schedule || []).findIndex(s => s.key === key);
        if (idx === -1) {
            return { success: false, message: 'That check-up is not on this monitoring schedule.' };
        }

        monitoring.schedule[idx] = {
            ...monitoring.schedule[idx],
            status: stepStatus,
            completedAt: stepStatus === 'done' ? now() : null,
            notes: clean(body.stepNotes) || monitoring.schedule[idx].notes || ''
        };
    }

    if (clean(body.notes)) monitoring.notes = clean(body.notes);

    monitoring.updatedBy = employee?.id || '';
    monitoring.updatedAt = now();

    const ok = await firestoreManager.updatePartialData('breeding', { id: record.id, monitoring });
    if (!ok) return { success: false, message: 'Failed to update monitoring.' };

    return { success: true, id: record.id, monitoring };
};

/**
 * Record the offspring of a completed breeding.
 *
 * @param {Object} employee
 * @param {Object} body { id, litterSize, deliveryDate, offspring: [{ name?, sex, weight?, notes? }], notes? }
 */
const recordOffspring = async (employee, body) => {
    const { id } = body || {};
    if (!id) return { success: false, message: 'Breeding id is required.' };

    const record = await firestoreManager.getData('breeding', String(id));
    if (!record) return { success: false, message: 'Breeding record not found.' };
    if (!record.breedingDetails) {
        return { success: false, message: 'Record the breeding first.' };
    }

    const deliveryDate = clean(body.deliveryDate) || now().slice(0, 10);
    if (Number.isNaN(new Date(deliveryDate).getTime())) {
        return { success: false, message: 'Enter a valid delivery date.' };
    }
    if (new Date(deliveryDate) > new Date()) {
        return { success: false, message: 'The delivery date cannot be in the future.' };
    }

    const incoming = Array.isArray(body.offspring) ? body.offspring : [];
    if (!incoming.length) {
        return { success: false, message: 'Add at least one offspring record.' };
    }

    const offspring = incoming.map((o, i) => {
        const sex = clean(o?.sex).toLowerCase();
        return {
            index: i + 1,
            name: clean(o?.name) || `Offspring ${i + 1}`,
            sex: sex === 'male' ? 'Male' : sex === 'female' ? 'Female' : '',
            weight: (() => {
                const n = Number(o?.weight);
                return Number.isFinite(n) && n > 0 ? n : null;
            })(),
            status: clean(o?.status).toLowerCase() === 'stillborn' ? 'stillborn' : 'alive',
            notes: clean(o?.notes)
        };
    });

    const alive = offspring.filter(o => o.status === 'alive').length;
    const stillborn = offspring.length - alive;

    const monitoring = {
        ...(record.monitoring || {}),
        pregnancyStatus: 'delivered',
        deliveredAt: deliveryDate,
        litterSize: offspring.length,
        updatedBy: employee?.id || '',
        updatedAt: now()
    };

    // The post-delivery check-up is scheduled a week out.
    const species = record.breedingDetails.species;
    const postCheck = addDays(deliveryDate, 7);
    monitoring.schedule = (monitoring.schedule || []).map(s =>
        s.key === 'post_delivery_check' ? { ...s, dueDate: postCheck || s.dueDate } : s
    );

    const ok = await firestoreManager.updatePartialData('breeding', {
        id: record.id,
        offspring,
        offspringRecordedBy: employee?.id || '',
        offspringRecordedAt: now(),
        monitoring
    });
    if (!ok) return { success: false, message: 'Failed to save the offspring records.' };

    notifyOwners(record, {
        title: 'Offspring recorded 🐾',
        message: `${offspring.length} offspring recorded for ${record.breedingDetails.combination} `
            + `on ${deliveryDate} (${alive} alive${stillborn ? `, ${stillborn} stillborn` : ''}). `
            + (postCheck ? `Post-delivery check-up: ${postCheck}.` : ''),
        payload: { breedingRef: record.id, litterSize: offspring.length }
    });

    await systemMessageBetween(
        record.ownerAId, record.ownerBId,
        `${offspring.length} offspring recorded for ${record.breedingDetails.combination} on ${deliveryDate}.`,
        { breedingRef: record.id }
    );

    return { success: true, id: record.id, offspring, monitoring, gestationDays: gestationFor(species) };
};

/**
 * Check-ups that are due (or overdue) across all active breedings.
 * Used both by the clinic dashboard and by the reminder sweep.
 */
const dueCheckups = async ({ withinDays = 3 } = {}) => {
    const records = await firestoreManager.getAllData('breeding', {});
    const today = now().slice(0, 10);
    const horizon = addDays(today, withinDays);

    const due = [];
    (records || []).forEach(r => {
        if (!r?.monitoring?.schedule) return;
        if (['rejected', 'cancelled'].includes(String(r.status))) return;
        if (String(r.monitoring.pregnancyStatus) === 'not_pregnant') return;

        r.monitoring.schedule.forEach(step => {
            if (step.status !== 'scheduled' || !step.dueDate) return;
            if (step.dueDate > horizon) return;

            due.push({
                breedingId: r.id,
                ownerAId: r.ownerAId,
                ownerBId: r.ownerBId,
                combination: r.breedingDetails?.combination || '',
                damName: r.breedingDetails?.damName || '',
                stepKey: step.key,
                label: step.label,
                dueDate: step.dueDate,
                overdue: step.dueDate < today
            });
        });
    });

    due.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    return { success: true, due, total: due.length };
};

/**
 * Send a reminder for every check-up due soon or overdue.
 * Reminders are marked on the step so the same one is not sent twice.
 */
const sendCheckupReminders = async ({ withinDays = 3 } = {}) => {
    const { due } = await dueCheckups({ withinDays });
    const today = now().slice(0, 10);
    let sent = 0;

    // Group by breeding so each record is written once.
    const byBreeding = {};
    due.forEach(d => {
        byBreeding[d.breedingId] = byBreeding[d.breedingId] || [];
        byBreeding[d.breedingId].push(d);
    });

    for (const [breedingId, steps] of Object.entries(byBreeding)) {
        const record = await firestoreManager.getData('breeding', String(breedingId));
        if (!record?.monitoring?.schedule) continue;

        let changed = false;
        const schedule = record.monitoring.schedule.map(step => {
            const hit = steps.find(s => s.stepKey === step.key);
            if (!hit) return step;
            // Don't re-remind for the same due date.
            if (step.remindedFor === step.dueDate) return step;
            changed = true;
            return { ...step, remindedAt: now(), remindedFor: step.dueDate };
        });

        if (!changed) continue;

        await firestoreManager.updatePartialData('breeding', {
            id: record.id,
            monitoring: { ...record.monitoring, schedule }
        });

        for (const s of steps) {
            const when = s.overdue ? `was due on ${s.dueDate}` : `is due on ${s.dueDate}`;
            notifyOwners(record, {
                title: s.overdue ? 'Check-up overdue ⏰' : 'Upcoming check-up 📅',
                message: `${s.label} for ${s.damName || 'your pet'} ${when}.`
                    + (s.overdue ? ' Please contact the clinic to reschedule.' : ' Please book an appointment.'),
                payload: { breedingRef: record.id, stepKey: s.stepKey, dueDate: s.dueDate }
            });
            sent += 1;
        }
    }

    return { success: true, sent, checked: due.length, date: today };
};

module.exports = {
    PREGNANCY_STATUSES,
    updatePregnancy,
    recordOffspring,
    dueCheckups,
    sendCheckupReminders
};
