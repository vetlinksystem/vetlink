const firestoreManager = require('../../fb/firestore_manager');
const { generateNotificationId } = require('../../utilities/idGenerator');

/**
 * Create a notification.
 * @param {Object} n
 * @param {string} n.clientId
 * @param {string} n.type
 * @param {string} n.title
 * @param {string} n.message
 * @param {Object} n.payload - extra data (e.g., breedingId)
 */
module.exports = async function addNotification({ clientId, type, title, message, payload = {} }) {
  const id = await generateNotificationId();
  const doc = {
    id,
    clientId,
    type,
    title: title || '',
    message: message || '',
    payload,
    read: false,
    createdAt: new Date().toISOString()
  };
  const ok = await firestoreManager.addData('notifications', doc);
  return ok ? doc : null;
};
