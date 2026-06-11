// src/models/client/chats/start.js
// Find-or-create a 1:1 conversation between two clients, optionally tied to a
// pair of pets (breeding context) and optionally sending a first message.
const firestoreManager = require('../../../fb/firestore_manager');
const { generateConversationId } = require('../../../utilities/idGenerator');
const {
    getClient, findConversationBetween, appendMessage
} = require('../../breeding/service');
const sendMessageNotification = require('./notify');

module.exports = async function startConversation(clientId, req_body) {
    const { otherClientId, myPetId, otherPetId, text } = req_body || {};

    if (!otherClientId) {
        return { success: false, message: 'otherClientId is required.' };
    }
    if (String(otherClientId) === String(clientId)) {
        return { success: false, message: 'You cannot chat with yourself.' };
    }

    const other = await getClient(otherClientId);
    if (!other) {
        return { success: false, message: 'The other pet owner was not found.' };
    }

    let conversation = await findConversationBetween(clientId, otherClientId);
    let created = false;

    if (!conversation) {
        const id = await generateConversationId();
        conversation = {
            id,
            participantIds: [String(clientId), String(otherClientId)],
            petIds: [myPetId, otherPetId].filter(Boolean).map(String),
            lastMessage: '',
            lastMessageAt: '',
            lastSenderId: '',
            unread: { [String(clientId)]: 0, [String(otherClientId)]: 0 },
            createdAt: new Date().toISOString()
        };
        const ok = await firestoreManager.addData('conversations', conversation);
        if (!ok) return { success: false, message: 'Failed to start conversation.' };
        created = true;
    } else if (myPetId || otherPetId) {
        // Remember pets discussed in this conversation (used for availability notices)
        const petIds = [...new Set([...(conversation.petIds || []), myPetId, otherPetId].filter(Boolean).map(String))];
        if (petIds.length !== (conversation.petIds || []).length) {
            await firestoreManager.updatePartialData('conversations', { id: conversation.id, petIds });
            conversation.petIds = petIds;
        }
    }

    const messageText = (text || '').toString().trim();
    if (messageText) {
        const result = await appendMessage(conversation, { senderId: String(clientId), text: messageText });
        if (result) {
            sendMessageNotification(conversation, String(clientId), messageText, result.unread).catch(() => {});
        }
    }

    return { success: true, created, conversationId: conversation.id, conversation };
};
