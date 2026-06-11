const firestoreManager = require('../../fb/firestore_manager');
const { publicPet, publicOwner } = require('./service');

/**
 * All breeding records, enriched with pet and owner details for the
 * employee Breeding page. Newest first, "accepted" (needs clinic approval)
 * floated to the top.
 */
const getAllBreeding = async () => {
    try {
        const [records, pets, clients] = await Promise.all([
            firestoreManager.getAllData('breeding', {}),
            firestoreManager.getAllData('pets', {}),
            firestoreManager.getAllData('clients', {})
        ]);

        const petById = {};
        (pets || []).forEach(p => { petById[String(p.id)] = p; });
        const clientById = {};
        (clients || []).forEach(c => { clientById[String(c.id)] = c; });

        const enriched = (records || []).map(r => ({
            ...r,
            petA: publicPet(petById[String(r.petAId)]) || { id: r.petAId, name: r.petAId },
            petB: publicPet(petById[String(r.petBId)]) || { id: r.petBId, name: r.petBId },
            ownerA: publicOwner(clientById[String(r.ownerAId)]) || { id: r.ownerAId, name: r.ownerAId },
            ownerB: publicOwner(clientById[String(r.ownerBId)]) || { id: r.ownerBId, name: r.ownerBId },
            proposedBy: r.proposedBy || 'clinic'
        }));

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
