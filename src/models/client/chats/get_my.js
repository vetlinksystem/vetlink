// src/models/client/chats/get_my.js
// Conversation list for the logged-in client, enriched with the other
// participant's name/avatar and my unread count. Newest activity first.
const firestoreManager = require('../../../fb/firestore_manager');

module.exports = async function getMyConversations(clientId) {
    const me = String(clientId);
    const all = await firestoreManager.getAllData('conversations', {});
    const mine = (all || []).filter(c => (c.participantIds || []).map(String).includes(me));

    const clients = await firestoreManager.getAllData('clients', {});
    const clientById = {};
    (clients || []).forEach(c => { clientById[String(c.id)] = c; });

    const conversations = mine.map(c => {
        const otherId = (c.participantIds || []).map(String).find(pid => pid !== me) || '';
        const other = clientById[otherId];
        return {
            id: c.id,
            otherClient: {
                id: otherId,
                name: other?.name || 'Pet owner',
                avatarUrl: other?.avatarUrl || null
            },
            petIds: c.petIds || [],
            lastMessage: c.lastMessage || '',
            lastMessageAt: c.lastMessageAt || c.createdAt || '',
            lastSenderId: c.lastSenderId || '',
            unreadCount: (c.unread || {})[me] || 0,
            createdAt: c.createdAt || ''
        };
    }).sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)));

    return { success: true, conversations, total: conversations.length };
};
