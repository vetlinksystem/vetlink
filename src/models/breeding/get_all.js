const firestoreManager = require('../../fb/firestore_manager');
const { publicPet, publicOwner } = require('./service');
const { assessPair, buildHealthInfo } = require('./compatibility');

/**
 * All breeding records, enriched with pet and owner details for the
 * employee Breeding page. Newest first, "accepted" (needs clinic approval)
 * floated to the top.
 *
 * Each record carries its compatibility assessment — the score, risk level and the
 * specific flags — so the veterinarian can see *why* a pairing was flagged before
 * deciding. Proposals made before scoring existed are assessed on read, so older
 * records are not left blank on the decision screen.
 */
const getAllBreeding = async () => {
    try {
        const [records, pets, clients, medicalRecords] = await Promise.all([
            firestoreManager.getAllData('breeding', {}),
            firestoreManager.getAllData('pets', {}),
            firestoreManager.getAllData('clients', {}),
            firestoreManager.getAllData('records', {})
        ]);

        const petById = {};
        (pets || []).forEach(p => { petById[String(p.id)] = p; });
        const clientById = {};
        (clients || []).forEach(c => { clientById[String(c.id)] = c; });

        const healthInfo = buildHealthInfo(medicalRecords, (pets || []).map(p => p.id));

        const enriched = (records || []).map(r => {
            const rawA = petById[String(r.petAId)];
            const rawB = petById[String(r.petBId)];

            // Use the assessment snapshot taken at proposal time; fall back to assessing
            // now for records created before compatibility scoring existed.
            let compatibility = r.compatibility || null;
            if (!compatibility && rawA && rawB) {
                const a = assessPair(rawA, rawB, healthInfo);
                compatibility = {
                    score: a.score,
                    risk: a.risk,
                    breedStatus: a.breedStatus,
                    requiresVetReview: a.requiresVetReview,
                    recommendation: a.recommendation,
                    flags: a.flags,
                    breakdown: a.breakdown,
                    assessedOnRead: true
                };
            }

            return {
                ...r,
                petA: publicPet(rawA) || { id: r.petAId, name: r.petAId },
                petB: publicPet(rawB) || { id: r.petBId, name: r.petBId },
                ownerA: publicOwner(clientById[String(r.ownerAId)]) || { id: r.ownerAId, name: r.ownerAId },
                ownerB: publicOwner(clientById[String(r.ownerBId)]) || { id: r.ownerBId, name: r.ownerBId },
                proposedBy: r.proposedBy || 'clinic',
                compatibility,
                conditions: Array.isArray(r.conditions) ? r.conditions : [],
                decisionOutcome: r.decisionOutcome || ''
            };
        });

        const rank = (s) => (s === 'accepted' ? 0 : s === 'pending' ? 1 : 2);
        enriched.sort((a, b) =>
            rank(String(a.status)) - rank(String(b.status)) ||
            String(b.requestedAt || '').localeCompare(String(a.requestedAt || ''))
        );

        return enriched;
    } catch (error) {
        throw error;
    }
};

module.exports = getAllBreeding;
