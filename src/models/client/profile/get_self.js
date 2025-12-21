const firestoreManager = require('../../../fb/firestore_manager');

const getClientSelf = async (clientId) => {
  if (!clientId) {
    return { success: false, message: 'Missing client id.' };
  }

  try {
    const list = await firestoreManager.getAllData('clients', { id: clientId });
    const client = Array.isArray(list) ? list.find(c => c.id === clientId) : null;

    if (!client) {
      return { success: false, message: 'Client not found.' };
    }

    // Hide password
    const { password, ...safe } = client;

    return {
      success: true,
      client: safe
    };
  } catch (error) {
    throw error;
  }
};

module.exports = getClientSelf;
