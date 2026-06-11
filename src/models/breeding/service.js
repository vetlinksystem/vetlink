// src/models/breeding/service.js
// Shared helpers for the client-driven breeding flow.
const firestoreManager = require('../../fb/firestore_manager');
const addNotification = require('../notifications/add');
const { generateMessageId } = require('../../utilities/idGenerator');

// "YYYY-MM-DD HH:MM:SS" (same format used by breeding requestedAt)
const now = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// getAllData matches with .includes(), so re-check ids exactly.
const byExactId = (rows, id) => (rows || []).find(r => String(r.id) === String(id));

const getPet = async (petId) => {
    if (!petId) return null;
    const pet = await firestoreManager.getData('pets', String(petId));
    return pet || null;
};

const getClient = async (clientId) => {
    if (!clientId) return null;
    const client = await firestoreManager.getData('clients', String(clientId));
    return client || null;
};

const publicPet = (p) => p ? ({
    id: p.id,
    name: p.name || p.petName || 'Pet',
    breed: p.breed || '',
    species: p.species || '',
    sex: p.sex || '',
    age: (typeof p.age === 'number') ? p.age : (p.age || null),
    imageUrl: p.imageUrl || null,
    ownerId: p.ownerId || ''
}) : null;

const publicOwner = (c) => c ? ({ id: c.id, name: c.name || c.email || 'Pet owner' }) : null;

const isBreedingAllowed = (pet) => {
    if (!pet) return false;
    if (typeof pet.breedingAllowed !== 'undefined') return !!pet.breedingAllowed;
    if (typeof pet.allowBreeding !== 'undefined') return !!pet.allowBreeding;
    return false;
};

// Statuses that make a pair/pet "taken"
const ACTIVE_STATUSES = ['accepted', 'approved'];
const OPEN_STATUSES = ['pending', 'accepted', 'approved'];

const getAllBreedingRecords = async () => {
    const rows = await firestoreManager.getAllData('breeding', {});
    return Array.isArray(rows) ? rows : [];
};

/**
 * Map of petId -> active breeding record (accepted/approved).
 * Pets in this map are no longer available as breeding candidates.
 */
const getMatchedPetMap = (records) => {
    const map = {};
    (records || []).forEach(r => {
        if (!ACTIVE_STATUSES.includes(String(r.status || ''))) return;
        if (r.petAId) map[String(r.petAId)] = r;
        if (r.petBId) map[String(r.petBId)] = r;
    });
    return map;
};

/**
 * Find an open (pending/accepted/approved) proposal between two pets, either direction.
 */
const findOpenProposalBetween = (records, petXId, petYId) => {
    const x = String(petXId), y = String(petYId);
    return (records || []).find(r => {
        if (!OPEN_STATUSES.includes(String(r.status || ''))) return false;
        const a = String(r.petAId || ''), b = String(r.petBId || '');
        return (a === x && b === y) || (a === y && b === x);
    }) || null;
};

/**
 * Notify all admin/vet employees (in-app inbox, fire-and-forget per employee).
 */
const notifyAdmins = async ({ type, title, message, payload = {} }) => {
    const employees = await firestoreManager.getAllData('employees', {});
    const staff = (employees || []).filter(e => {
        const pos = String(e?.position || e?.role || '').toLowerCase();
        return !!e?.isAdmin || pos.includes('admin') || pos.includes('vet');
    });
    await Promise.all(staff.map(e =>
        addNotification({ clientId: e.id, type, title, message, payload }).catch(() => {})
    ));
};

// ===== Chat helpers (conversations / messages collections) =====

const findConversationBetween = async (clientIdA, clientIdB) => {
    const all = await firestoreManager.getAllData('conversations', {});
    const a = String(clientIdA), b = String(clientIdB);
    return (all || []).find(c => {
        const ids = (c.participantIds || []).map(String);
        return ids.length === 2 && ids.includes(a) && ids.includes(b);
    }) || null;
};

const getConversation = async (conversationId) => {
    if (!conversationId) return null;
    const convo = await firestoreManager.getData('conversations', String(conversationId));
    return convo || null;
};

/**
 * Append a message to a conversation and update its preview/unread counters.
 * type: 'text' | 'system' | 'breeding_proposal'
 * senderId: client id, or null for system messages.
 */
const appendMessage = async (conversation, { senderId, text, type = 'text', payload = {} }) => {
    const id = await generateMessageId();
    const message = {
        id,
        conversationId: conversation.id,
        senderId: senderId || 'system',
        text: text || '',
        type,
        payload: payload || {},
        createdAt: new Date().toISOString()
    };
    const ok = await firestoreManager.addData('messages', message);
    if (!ok) return null;

    const unread = { ...(conversation.unread || {}) };
    (conversation.participantIds || []).forEach(pid => {
        const key = String(pid);
        if (typeof unread[key] !== 'number') unread[key] = 0;
        if (key !== String(senderId)) unread[key] = unread[key] + 1;
    });

    await firestoreManager.updatePartialData('conversations', {
        id: conversation.id,
        lastMessage: message.text,
        lastMessageAt: message.createdAt,
        lastSenderId: message.senderId,
        unread
    });

    return { message, unread };
};

/**
 * Drop a system message into the conversation between two clients, if one exists.
 */
const systemMessageBetween = async (clientIdA, clientIdB, text, payload = {}) => {
    try {
        const convo = await findConversationBetween(clientIdA, clientIdB);
        if (!convo) return;
        await appendMessage(convo, { senderId: null, text, type: 'system', payload });
    } catch (_) { /* fire-and-forget */ }
};

/**
 * When a breeding is approved by the clinic, every other open proposal that
 * involves either pet is auto-cancelled and the affected owners are notified.
 */
const cancelCompetingProposals = async (approvedRecord, pets) => {
    const records = await getAllBreedingRecords();
    const involved = [String(approvedRecord.petAId), String(approvedRecord.petBId)];
    const losers = records.filter(r =>
        String(r.id) !== String(approvedRecord.id) &&
        ['pending', 'accepted'].includes(String(r.status || '')) &&
        (involved.includes(String(r.petAId)) || involved.includes(String(r.petBId)))
    );

    const petName = (petId) => {
        const p = (pets || []).find(x => String(x.id) === String(petId));
        return p ? (p.name || petId) : petId;
    };

    for (const r of losers) {
        await firestoreManager.updatePartialData('breeding', {
            id: r.id,
            status: 'cancelled',
            cancelReason: 'pet_no_longer_available',
            decidedAt: now()
        });

        const takenPetId = involved.includes(String(r.petAId)) ? r.petAId : r.petBId;
        const notifyIds = [r.ownerAId, r.ownerBId]
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i);

        for (const ownerId of notifyIds) {
            addNotification({
                clientId: ownerId,
                type: 'breeding_update',
                title: 'Breeding proposal cancelled',
                message: `${petName(takenPetId)} is no longer available for breeding (another pairing was approved), so your proposal was cancelled.`,
                payload: { breedingRef: r.id }
            }).catch(() => {});
        }

        if (r.ownerAId && r.ownerBId && String(r.ownerAId) !== String(r.ownerBId)) {
            await systemMessageBetween(
                r.ownerAId, r.ownerBId,
                `${petName(takenPetId)} is no longer available for breeding. This proposal was cancelled.`,
                { breedingRef: r.id }
            );
        }
    }

    return losers.length;
};

module.exports = {
    now,
    byExactId,
    getPet,
    getClient,
    publicPet,
    publicOwner,
    isBreedingAllowed,
    ACTIVE_STATUSES,
    OPEN_STATUSES,
    getAllBreedingRecords,
    getMatchedPetMap,
    findOpenProposalBetween,
    notifyAdmins,
    findConversationBetween,
    getConversation,
    appendMessage,
    systemMessageBetween,
    cancelCompetingProposals
};