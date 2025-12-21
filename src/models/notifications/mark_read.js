const firestoreManager = require('../../fb/firestore_manager');

module.exports = async function markRead(clientId, id) {
  const notif = await firestoreManager.getData('notifications', id);
  if (!notif) return false;
  if (String(notif.clientId) !== String(clientId)) return false;

  return await firestoreManager.updatePartialData('notifications', {
    id,
    read: true,
    readAt: new Date().toISOString(),
  });
};
