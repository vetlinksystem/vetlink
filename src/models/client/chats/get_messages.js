// src/models/client/chats/get_messages.js
// Messages of one conversation (participant-only), oldest first.
// Supports ?after=<messageId> for cheap incremental polling.
const firestoreManager = require('../../../fb/firestore_manager');
const { getConversation } = require('../../breeding/service');

const seqOf = (id) => {
    const n = parseInt(String(id || '').replace(/^\D+/, ''), 10);
    return Number.isFinite(n) ? n : 0;
};

module.exports = async function getMessages(clientId, conversationId, options = {}) {
    const conversation = await getConversation(conversationId);
    if (!conversation) {
        return { success: false, message: 'Conversation not found.' };
    }
    if (!(conversation.participantIds || []).map(String).includes(String(clientId))) {
        return { success: false, message: 'You are not part of this conversation.' };
    }

    const rows = await firestoreManager.getAllData('messages', { conversationId });
    // getAllData matches with .includes(), so re-check exactly
    let messages = (rows || []).filter(m => String(m.conversationId) === String(conversationId));

    messages.sort((a, b) =>
        String(a.createdAt || '').localeCompare(String(b.createdAt || '')) ||
        seqOf(a.id) - seqOf(b.id)
    );

    const after = options.after;
    if (after) {
        const idx = messages.findIndex(m => String(m.id) === String(after));
        if (idx >= 0) messages = messages.slice(idx + 1);
    }

    return {
        success: true,
        conversation: {
            id: conversation.id,
            participantIds: conversation.participantIds || [],
            petIds: conversation.petIds || []
        },
        messages,
        total: messages.length
    };
};
