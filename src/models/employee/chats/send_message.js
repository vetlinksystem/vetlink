// src/models/employee/chats/send_message.js
// Send a message as clinic staff in an existing conversation.
//
// The message store is shared with owner-to-owner chat (models/breeding/service
// appendMessage), so unread counters and previews behave identically; only the
// participant check differs, since the sender here is an employee.
const { getConversation, appendMessage } = require('../../breeding/service');
const { isParticipant } = require('../../chats/participants');
const sendMessageNotification = require('../../client/chats/notify');

/**
 * @param {Object} employee { id, name }
 * @param {string} conversationId
 * @param {Object} body { text }
 */
module.exports = async function sendClinicMessage(employee, conversationId, body) {
    const employeeId = employee?.id;
    if (!employeeId) return { success: false, message: 'Missing employee id.' };

    const text = String(body?.text || '').trim();
    if (!text) return { success: false, message: 'Type a message first.' };
    if (text.length > 2000) return { success: false, message: 'That message is too long.' };

    const conversation = await getConversation(conversationId);
    if (!conversation) return { success: false, message: 'Conversation not found.' };

    if (!isParticipant(conversation, employeeId)) {
        return { success: false, message: 'You are not part of this conversation.' };
    }

    const result = await appendMessage(conversation, { senderId: String(employeeId), text });
    if (!result) return { success: false, message: 'Failed to send the message.' };

    sendMessageNotification(conversation, String(employeeId), text, result.unread)
        .catch(err => console.warn('chat notification failed:', err?.message || err));

    return { success: true, message: result.message, unread: result.unread };
};
