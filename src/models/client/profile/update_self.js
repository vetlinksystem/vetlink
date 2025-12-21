const firestoreManager = require('../../../fb/firestore_manager');

const updateClientSelf = async (clientId, body) => {
  if (!clientId) {
    return { success: false, message: 'Missing client id.' };
  }

  const {
    name,
    email,
    number,
    address,
    password   // optional new password
  } = body || {};

  const updateData = { id: clientId };

  if (typeof name     !== 'undefined') updateData.name     = name;
  if (typeof email    !== 'undefined') updateData.email    = email;
  if (typeof number   !== 'undefined') updateData.number   = number;
  if (typeof address  !== 'undefined') updateData.address  = address;
  if (typeof password !== 'undefined' && password !== '')  updateData.password = password;

  try {
    const ok = await firestoreManager.updatePartialData('clients', updateData);
    if (!ok) {
      return { success: false, message: 'Failed to update profile.' };
    }

    const list = await firestoreManager.getAllData('clients', { id: clientId });
    const client = Array.isArray(list) ? list.find(c => c.id === clientId) : null;

    return {
      success: true,
      client: client || updateData
    };
  } catch (error) {
    throw error;
  }
};

module.exports = updateClientSelf;
