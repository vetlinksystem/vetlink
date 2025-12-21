const firestoreManager = require('../../fb/firestore_manager');

/**
 * Returns notifications for a client sorted by newest first.
 */
module.exports = async function getMyNotifications(clientId) {
  const rows = await firestoreManager.getAllData('notifications', { clientId: clientId || '' });
  return (rows || []).sort((a, b) => {
    const ad = new Date(a.createdAt || a.created_at || 0).getTime();
    const bd = new Date(b.createdAt || b.created_at || 0).getTime();
    return bd - ad;
  });
};
