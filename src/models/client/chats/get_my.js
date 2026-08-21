// src/models/client/chats/get_my.js
// Conversation list for the logged-in client, enriched with the other participant's
// name/avatar and my unread count. Newest activity first.
//
// The other participant may be another pet owner OR clinic staff — the clinic asked for
// "Message veterinarian to customer" — so participants are resolved through
// models/chats/participants.js rather than assumed to be clients.
const {
    conversationsFor, loadAllParticipants, otherIdOf, typeOf, EMPLOYEE
} = require('../../chats/participants');

module.exports = async function getMyConversations(clientId) {
    const me = String(clientId);
    const mine = await conversationsFor(me);
    const participantById = await loadAllParticipants(mine);

    const conversations = mine.map(c => {
        const otherId = otherIdOf(c, me);
        const other = participantById[otherId];
        const otherType = typeOf(c, otherId);
        const isClinic = otherType === EMPLOYEE;

        return {
            id: c.id,
            // Kept as `otherClient` so existing front-ends keep working; `type` and
            // `position` are additive so the UI can label a clinic conversation.
            otherClient: {
                id: otherId,
                name: other?.name || (isClinic ? 'Clinic staff' : 'Pet owner'),
                avatarUrl: other?.avatarUrl || null,
                type: otherType,
                position: other?.position || ''
            },
            isClinic,
            petIds: c.petIds || [],
            lastMessage: c.lastMessage || '',
            lastMessageAt: c.lastMessageAt || c.createdAt || '',
            lastSenderId: c.lastSenderId || '',
            unreadCount: (c.unread || {})[me] || 0,
            createdAt: c.createdAt || ''
        };
    }).sort((a, b) => {
        // Clinic conversations float up when equally recent — a message from the vet
        // matters more to the owner than owner-to-owner chatter.
        const byTime = String(b.lastMessageAt).localeCompare(String(a.lastMessageAt));
        if (byTime !== 0) return byTime;
        return Number(b.isClinic) - Number(a.isClinic);
    });

    return { success: true, conversations, total: conversations.length };
};
