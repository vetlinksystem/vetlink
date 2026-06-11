// src/models/client/chats/notify.js
// Notify the other participant about a new chat message — but only when this
// message is the first unread one (so a long conversation doesn't flood the
// notification inbox).
const addNotification = require('../../notifications/add');
const { getClient } = require('../../breeding/service');

module.exports = async function sendMessageNotification(conversation, senderId, text, unread) {
    const recipientId = (conversation.participantIds || [])
        .map(String)
        .find(pid => pid !== String(senderId));
    if (!recipientId) return;

    const unreadCount = (unread || {})[recipientId];
    if (typeof unreadCount === 'number' && unreadCount > 1) return; // already notified

    const sender = await getClient(senderId);
    const senderName = sender?.name || 'A pet owner';
    const preview = String(text || '').slice(0, 120);

    await addNotification({
        clientId: recipientId,
        type: 'chat_message',
        title: `New message from ${senderName}`,
        message: preview,
        payload: { conversationId: conversation.id, senderId: String(senderId) }
    });
};
