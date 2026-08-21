// src/models/employee/chats/start.js
// Find-or-create a conversation between a clinic employee and a pet owner.
//
// This is the "Message veterinarian to customer" feature: the clinic can open a thread
// with an owner about one of their pets — a result to explain, a follow-up to arrange,
// a breeding decision to discuss.
const firestoreManager = require('../../../fb/firestore_manager');
const { generateConversationId } = require('../../../utilities/idGenerator');
const { appendMessage } = require('../../breeding/service');
const {
    findConversation, buildTypes, CLIENT, EMPLOYEE
} = require('../../chats/participants');
const sendMessageNotification = require('../../client/chats/notify');

/**
 * @param {Object} employee { id, name }
 * @param {Object} body { clientId, petId?, text? }
 */
module.exports = async function startClinicConversation(employee, body) {
    const employeeId = employee?.id;
    const { clientId, petId, text } = body || {};

    if (!employeeId) return { success: false, message: 'Missing employee id.' };
    if (!clientId) return { success: false, message: 'Select the pet owner to message.' };

    const client = await firestoreManager.getData('clients', String(clientId));
    if (!client) return { success: false, message: 'That pet owner was not found.' };

    // If a pet was named, confirm it belongs to this owner — otherwise the thread would
    // be about someone else's animal.
    if (petId) {
        const pet = await firestoreManager.getData('pets', String(petId));
        if (!pet) return { success: false, message: 'Pet not found.' };
        if (String(pet.ownerId) !== String(clientId)) {
            return { success: false, message: 'That pet does not belong to this owner.' };
        }
    }

    let conversation = await findConversation(employeeId, clientId);
    let created = false;

    if (!conversation) {
        const id = await generateConversationId();
        conversation = {
            id,
            participantIds: [String(employeeId), String(clientId)],
            participantTypes: buildTypes([
                { id: employeeId, type: EMPLOYEE },
                { id: clientId, type: CLIENT }
            ]),
            petIds: petId ? [String(petId)] : [],
            lastMessage: '',
            lastMessageAt: '',
            lastSenderId: '',
            unread: { [String(employeeId)]: 0, [String(clientId)]: 0 },
            createdAt: new Date().toISOString()
        };
        const ok = await firestoreManager.addData('conversations', conversation);
        if (!ok) return { success: false, message: 'Failed to start the conversation.' };
        created = true;
    } else if (petId) {
        // Remember the pets this thread is about.
        const petIds = [...new Set([...(conversation.petIds || []), String(petId)])];
        if (petIds.length !== (conversation.petIds || []).length) {
            await firestoreManager.updatePartialData('conversations', { id: conversation.id, petIds });
            conversation.petIds = petIds;
        }
    }

    const messageText = String(text || '').trim();
    if (messageText) {
        const result = await appendMessage(conversation, {
            senderId: String(employeeId),
            text: messageText
        });
        if (result) {
            sendMessageNotification(conversation, String(employeeId), messageText, result.unread)
                .catch(err => console.warn('chat notification failed:', err?.message || err));
        }
    }

    return { success: true, created, conversationId: conversation.id, conversation };
};
