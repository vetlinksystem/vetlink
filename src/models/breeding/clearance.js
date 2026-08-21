// src/models/breeding/clearance.js
// Step 9 of the breeding flow: "Before breeding, both pets undergo a final health
// examination."
//
// A pairing the clinic approved is not yet allowed to breed. The veterinarian records
// the final examination here, which moves the record from `approved` to `cleared`.
// Only a cleared breeding can have its breeding record entered (see record_details.js).
const firestoreManager = require('../../fb/firestore_manager');
const addNotification = require('../notifications/add');
const { now, getPet, systemMessageBetween } = require('./service');

const clean = (v) => String(v ?? '').trim();

/**
 * Record the final pre-breeding veterinary clearance.
 *
 * @param {Object} employee  the veterinarian (from requirePermission('breeding.decide'))
 * @param {Object} body      { id, petAFit, petBFit, findings?, notes? }
 */
module.exports = async function finalClearance(employee, body) {
    const { id, findings, notes } = body || {};

    if (!id) return { success: false, message: 'Breeding id is required.' };

    const record = await firestoreManager.getData('breeding', String(id));
    if (!record) return { success: false, message: 'Breeding record not found.' };

    if (String(record.status) !== 'approved') {
        return {
            success: false,
            message: `Only an approved breeding can be given final clearance (this one is ${record.status}).`
        };
    }

    // Both pets must be examined and found fit; either failing blocks the breeding.
    const petAFit = body?.petAFit === true || body?.petAFit === 'true';
    const petBFit = body?.petBFit === true || body?.petBFit === 'true';

    const [petA, petB] = await Promise.all([getPet(record.petAId), getPet(record.petBId)]);
    const petAName = petA?.name || record.petAId;
    const petBName = petB?.name || record.petBId;
    const pairLabel = `${petAName} × ${petBName}`;

    const owners = [record.ownerAId, record.ownerBId]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);

    const clearance = {
        examinedBy: employee?.id || '',
        examinedByName: employee?.name || '',
        petAFit,
        petBFit,
        findings: clean(findings),
        notes: clean(notes),
        examinedAt: now()
    };

    // If either pet is not fit the breeding is stopped rather than cleared.
    if (!petAFit || !petBFit) {
        const unfit = [!petAFit ? petAName : null, !petBFit ? petBName : null].filter(Boolean);

        const ok = await firestoreManager.updatePartialData('breeding', {
            id: record.id,
            status: 'rejected',
            decisionOutcome: 'failed_final_examination',
            clearance,
            decidedAt: now()
        });
        if (!ok) return { success: false, message: 'Failed to update record.' };

        // Free both pets so they can be matched again once healthy.
        for (const pid of [record.petAId, record.petBId]) {
            if (!pid) continue;
            firestoreManager.updatePartialData('pets', {
                id: String(pid),
                breedingMatchId: null,
                breedingMatchedAt: null
            }).catch(() => {});
        }

        const reason = clearance.findings
            ? ` Findings: ${clearance.findings}`
            : '';

        for (const ownerId of owners) {
            addNotification({
                clientId: ownerId,
                type: 'breeding_update',
                title: 'Breeding stopped — final examination',
                message: `The final health examination for ${pairLabel} was not passed by ${unfit.join(' and ')}, `
                    + `so the breeding will not proceed.${reason}`,
                payload: { breedingRef: record.id, unfit }
            }).catch(() => {});
        }

        await systemMessageBetween(
            record.ownerAId, record.ownerBId,
            `The final health examination for ${pairLabel} was not passed. The breeding will not proceed.${reason}`,
            { breedingRef: record.id }
        );

        return {
            success: true,
            id: record.id,
            status: 'rejected',
            outcome: 'failed_final_examination',
            unfit
        };
    }

    // Both fit → cleared to breed.
    const ok = await firestoreManager.updatePartialData('breeding', {
        id: record.id,
        status: 'cleared',
        clearance,
        clearedAt: now()
    });
    if (!ok) return { success: false, message: 'Failed to update record.' };

    const conditionNote = (record.conditions || []).length
        ? ` Remember the conditions set at approval: ${record.conditions.map((c, i) => `(${i + 1}) ${c}`).join(' ')}`
        : '';

    for (const ownerId of owners) {
        addNotification({
            clientId: ownerId,
            type: 'breeding_update',
            title: 'Final health clearance passed ✅',
            message: `Both pets passed the final health examination for ${pairLabel}. `
                + `Breeding may now proceed under veterinary supervision.${conditionNote}`,
            payload: { breedingRef: record.id }
        }).catch(() => {});
    }

    await systemMessageBetween(
        record.ownerAId, record.ownerBId,
        `Both pets passed the final health examination for ${pairLabel}. Breeding may now proceed.`,
        { breedingRef: record.id }
    );

    return { success: true, id: record.id, status: 'cleared', clearance };
};
