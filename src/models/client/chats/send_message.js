// src/models/client/chats/send_message.js
const { getConversation, appendMessage } = require('../../breeding/service');
const sendMessageNotification = require('./notify');

module.exports = async function sendMessage(clientId, conversationId, req_body) {
    const text = (req_body?.text || '').toString().trim();
    if (!text) {
        return { success: false, message: 'Message text is required.' };
    }
    if (text.length > 2000) {
        return { success: false, message: 'Message is too long (max 2000 characters).' };
    }

    const conversation = await getConversation(conversationId);
    if (!conversation) {
        return { success: false, message: 'Conversation not found.' };
    }
    if (!(conversation.participantIds || []).map(String).includes(String(clientId))) {
        return { success: false, message: 'You are not part of this conversation.' };
    }

    const result = await appendMessage(conversation, { senderId: String(clientId), text });
    if (!result) {
        return { success: false, message: 'Failed to send message.' };
    }

    sendMessageNotification(conversation, String(clientId), text, result.unread).catch(() => {});

    return { success: true, message: result.message };
};
