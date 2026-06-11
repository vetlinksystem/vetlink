// src/models/client/chats/mark_read.js
const firestoreManager = require('../../../fb/firestore_manager');
const { getConversation } = require('../../breeding/service');

module.exports = async function markConversationRead(clientId, conversationId) {
    const conversation = await getConversation(conversationId);
    if (!conversation) {
        return { success: false, message: 'Conversation not found.' };
    }
    if (!(conversation.participantIds || []).map(String).includes(String(clientId))) {
        return { success: false, message: 'You are not part of this conversation.' };
    }

    const unread = { ...(conversation.unread || {}) };
    unread[String(clientId)] = 0;

    const ok = await firestoreManager.updatePartialData('conversations', {
        id: conversation.id,
        unread
    });

    return { success: !!ok, conversationId: conversation.id };
};
