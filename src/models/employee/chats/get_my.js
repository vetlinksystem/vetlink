// src/models/employee/chats/get_my.js
// Conversation list for the logged-in clinic employee.
//
// Staff only ever converse with pet owners, never with each other, so every
// conversation here has exactly one client on the other side.
const firestoreManager = require('../../../fb/firestore_manager');
const {
    conversationsFor, loadAllParticipants, otherIdOf, typeOf, CLIENT
} = require('../../chats/participants');

module.exports = async function getEmployeeConversations(employeeId) {
    const me = String(employeeId);
    const mine = await conversationsFor(me);
    const participantById = await loadAllParticipants(mine);

    // Pet names for the pets discussed in these conversations, so the list can show
    // "Maria Dela Cruz · about Buddy" without a request per row.
    const petIds = new Set();
    mine.forEach(c => (c.petIds || []).forEach(p => petIds.add(String(p))));

    const petNameById = {};
    if (petIds.size) {
        const pets = await firestoreManager.getAllData('pets', {});
        (pets || []).forEach(p => {
            if (petIds.has(String(p.id))) petNameById[String(p.id)] = p.name || p.id;
        });
    }

    const conversations = mine.map(c => {
        const otherId = otherIdOf(c, me);
        const other = participantById[otherId];

        return {
            id: c.id,
            client: {
                id: otherId,
                name: other?.name || 'Pet owner',
                avatarUrl: other?.avatarUrl || null,
                type: typeOf(c, otherId) || CLIENT
            },
            petIds: c.petIds || [],
            petNames: (c.petIds || []).map(p => petNameById[String(p)]).filter(Boolean),
            lastMessage: c.lastMessage || '',
            lastMessageAt: c.lastMessageAt || c.createdAt || '',
            lastSenderId: c.lastSenderId || '',
            unreadCount: (c.unread || {})[me] || 0,
            createdAt: c.createdAt || ''
        };
    }).sort((a, b) => {
        // Unread first, then most recent — staff work through what needs a reply.
        const byUnread = Number(b.unreadCount > 0) - Number(a.unreadCount > 0);
        if (byUnread !== 0) return byUnread;
        return String(b.lastMessageAt).localeCompare(String(a.lastMessageAt));
    });

    const totalUnread = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0);

    return { success: true, conversations, total: conversations.length, totalUnread };
};
