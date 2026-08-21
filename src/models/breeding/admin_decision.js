// src/models/breeding/admin_decision.js
// Clinic (vet/admin employee) gives the final decision on a breeding pair
// that both owners already agreed on.
// Approve → record "approved", both pets become unavailable for breeding,
// every other open proposal involving either pet is auto-cancelled.
// Complete → record "completed", both pets become available for breeding again.
const firestoreManager = require('../../fb/firestore_manager');
const addNotification = require('../notifications/add');
const {
    now, getPet, systemMessageBetween, cancelCompetingProposals
} = require('./service');

module.exports = async function adminDecision(employee, req_body) {
    const { id, decision, notes, conditions } = req_body || {};

    if (!id || !decision) {
        return { success: false, message: 'id and decision are required.' };
    }

    const record = await firestoreManager.getData('breeding', String(id));
    if (!record) {
        return { success: false, message: 'Breeding record not found.' };
    }

    const value = String(decision).toLowerCase();

    // The crossbreeding document defines three veterinary risk-assessment outcomes:
    //   Approved · Approved with Conditions · Not Recommended
    // "approve_with_conditions" is the middle one; the conditions are recorded and
    // sent to both owners. "complete" closes out a finished breeding.
    const approve = value === 'approve';
    const approveWithConditions = value === 'approve_with_conditions';
    const reject = value === 'reject';
    const complete = value === 'complete';

    if (!approve && !approveWithConditions && !reject && !complete) {
        return { success: false, message: 'Unknown decision value.' };
    }

    if ((approve || approveWithConditions) && String(record.status) !== 'accepted') {
        return { success: false, message: 'Only proposals accepted by both owners can be approved.' };
    }

    // Conditions list, used by approve_with_conditions.
    const conditionList = (Array.isArray(conditions)
        ? conditions
        : String(conditions || '').split('\n'))
        .map(c => String(c).trim())
        .filter(Boolean);

    if (approveWithConditions && !conditionList.length) {
        return {
            success: false,
            message: 'List at least one condition when approving with conditions.'
        };
    }

    // A pairing the compatibility assessment flagged cannot be waved through with a
    // plain "approve": the vet must either attach conditions or decline. This is the
    // document's "any match with elevated risk should require veterinary approval".
    const assessment = record.compatibility || null;
    if (approve && assessment && assessment.requiresVetReview) {
        const flagText = (assessment.flags || []).join(' ');
        return {
            success: false,
            message: `This pairing was flagged as ${assessment.risk} risk and cannot be approved without conditions. `
                + `Use "Approve with conditions" or decline.${flagText ? ` Flagged: ${flagText}` : ''}`,
            requiresConditions: true,
            compatibility: assessment
        };
    }
    // A breeding can be declined at any point before it is completed — including after
    // clearance, if something changes.
    if (reject && !['pending', 'accepted', 'approved', 'cleared'].includes(String(record.status))) {
        return { success: false, message: `This record is already ${record.status}.` };
    }

    // Completion closes out a breeding that actually happened, so it requires the pair to
    // have passed the final health examination and to have a breeding record on file.
    if (complete) {
        if (String(record.status) !== 'cleared') {
            return {
                success: false,
                message: String(record.status) === 'approved'
                    ? 'Record the final health examination before completing this breeding.'
                    : `Only a cleared breeding can be completed (this one is ${record.status}).`
            };
        }
        if (!record.breedingDetails) {
            return {
                success: false,
                message: 'Enter the breeding record (date, mating type, sire and dam details) before completing.'
            };
        }
    }

    const [petA, petB] = await Promise.all([getPet(record.petAId), getPet(record.petBId)]);
    const petAName = petA?.name || record.petAId;
    const petBName = petB?.name || record.petBId;
    const pairLabel = `${petAName} × ${petBName}`;
    const owners = [record.ownerAId, record.ownerBId]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);

    if (reject) {
        const ok = await firestoreManager.updatePartialData('breeding', {
            id: record.id,
            status: 'rejected',
            // The document's third outcome: "Not Recommended".
            decisionOutcome: 'not_recommended',
            rejectedBy: 'admin',
            adminId: employee?.id || '',
            adminNotes: (notes || '').toString(),
            decidedAt: now()
        });
        if (!ok) return { success: false, message: 'Failed to update record.' };

        for (const ownerId of owners) {
            addNotification({
                clientId: ownerId,
                type: 'breeding_update',
                title: 'Breeding not recommended',
                message: `The clinic did not approve the breeding ${pairLabel}.${notes ? ` Note: ${notes}` : ''}`,
                payload: { breedingRef: record.id }
            }).catch(() => {});
        }

        await systemMessageBetween(
            record.ownerAId, record.ownerBId,
            `The clinic did not approve the breeding ${pairLabel}.${notes ? ` Note: ${notes}` : ''}`,
            { breedingRef: record.id }
        );

        return { success: true, id: record.id, status: 'rejected' };
    }

    if (complete) {
        const ok = await firestoreManager.updatePartialData('breeding', {
            id: record.id,
            status: 'completed',
            completedBy: employee?.id || '',
            completedAt: now()
        });
        if (!ok) return { success: false, message: 'Failed to update record.' };

        // Free both pets — "completed" no longer counts as an active match,
        // so they reappear as breeding candidates.
        for (const pid of [record.petAId, record.petBId]) {
            if (!pid) continue;
            firestoreManager.updatePartialData('pets', {
                id: String(pid),
                breedingMatchId: null,
                breedingMatchedAt: null
            }).catch(() => {});
        }

        for (const ownerId of owners) {
            addNotification({
                clientId: ownerId,
                type: 'breeding_update',
                title: 'Breeding completed 🎉',
                message: `The clinic marked the breeding ${pairLabel} as completed. Your pet is now available for breeding again.`,
                payload: { breedingRef: record.id }
            }).catch(() => {});
        }

        await systemMessageBetween(
            record.ownerAId, record.ownerBId,
            `The clinic marked the breeding ${pairLabel} as completed. Both pets are available for breeding again.`,
            { breedingRef: record.id }
        );

        return { success: true, id: record.id, status: 'completed' };
    }

    // Approve — plain, or with conditions the owners must satisfy.
    const ok = await firestoreManager.updatePartialData('breeding', {
        id: record.id,
        status: 'approved',
        decisionOutcome: approveWithConditions ? 'approved_with_conditions' : 'approved',
        conditions: approveWithConditions ? conditionList : [],
        adminId: employee?.id || '',
        adminNotes: (notes || '').toString(),
        decidedAt: now()
    });
    if (!ok) return { success: false, message: 'Failed to update record.' };

    // Mark both pets as matched (kept on the pet doc for quick lookups)
    for (const pid of [record.petAId, record.petBId]) {
        if (!pid) continue;
        firestoreManager.updatePartialData('pets', {
            id: String(pid),
            breedingMatchId: record.id,
            breedingMatchedAt: now()
        }).catch(() => {});
    }

    const conditionText = conditionList.length
        ? ` Conditions: ${conditionList.map((c, i) => `(${i + 1}) ${c}`).join(' ')}`
        : '';

    for (const ownerId of owners) {
        addNotification({
            clientId: ownerId,
            type: 'breeding_update',
            title: approveWithConditions ? 'Breeding approved with conditions ⚠️' : 'Breeding approved ✅',
            message: approveWithConditions
                ? `The clinic approved the breeding ${pairLabel} subject to conditions.${conditionText}`
                    + ' A final health examination is still required before breeding.'
                : `The clinic approved the breeding ${pairLabel}. Both pets are now reserved for this breeding and hidden from the match list.`
                    + ' A final health examination is required before breeding.',
            payload: {
                breedingRef: record.id,
                outcome: approveWithConditions ? 'approved_with_conditions' : 'approved',
                conditions: conditionList
            }
        }).catch(() => {});
    }

    await systemMessageBetween(
        record.ownerAId, record.ownerBId,
        approveWithConditions
            ? `The clinic approved the breeding ${pairLabel} with conditions.${conditionText}`
            : `The clinic approved the breeding ${pairLabel}! 🎉 Both pets are now reserved for this breeding.`,
        { breedingRef: record.id }
    );

    // Other open proposals involving these pets are now dead — tell those owners.
    const cancelled = await cancelCompetingProposals(record, [petA, petB].filter(Boolean));

    return {
        success: true,
        id: record.id,
        status: 'approved',
        outcome: approveWithConditions ? 'approved_with_conditions' : 'approved',
        conditions: conditionList,
        cancelledOthers: cancelled
    };
};
