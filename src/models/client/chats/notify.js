// src/models/client/chats/notify.js
// Notify the other participant about a new chat message — but only when this
// message is the first unread one (so a long conversation doesn't flood the
// notification inbox).
//
// Either side may now be clinic staff ("Message veterinarian to customer"), so the
// sender's name and the recipient are resolved by participant type. Notifications are
// stored per recipient id in the same collection, which the employee inbox also reads.
const addNotification = require('../../notifications/add');
const { loadParticipant, typeOf, otherIdOf, EMPLOYEE } = require('../../chats/participants');

module.exports = async function sendMessageNotification(conversation, senderId, text, unread) {
    const recipientId = otherIdOf(conversation, senderId);
    if (!recipientId) return;

    const unreadCount = (unread || {})[String(recipientId)];
    if (typeof unreadCount === 'number' && unreadCount > 1) return; // already notified

    const senderType = typeOf(conversation, senderId);
    const sender = await loadParticipant(senderId, senderType);

    const preview = String(text || '').slice(0, 120);

    // A message from the clinic is labelled as such so the owner can tell it apart
    // from another pet owner's message.
    const fromClinic = senderType === EMPLOYEE;
    const title = fromClinic
        ? `New message from the clinic — ${sender?.name || 'staff'}`
        : `New message from ${sender?.name || 'a pet owner'}`;

    await addNotification({
        clientId: String(recipientId),   // recipient id, whether client or employee
        type: 'chat_message',
        title,
        message: preview,
        payload: {
            conversationId: conversation.id,
            senderId: String(senderId),
            senderType,
            fromClinic
        }
    });
};
