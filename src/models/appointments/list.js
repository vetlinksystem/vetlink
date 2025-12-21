const firestoreManager = require('../../fb/firestore_manager');

// List all appointments (optionally with limit/offset parameters kept for API compatibility)
const listAppointments = async ({ limit = 0, offset = 0 } = {}) => {
  // NOTE: firestoreManager.getAllData currently ignores limit/offset (it fetches all then filters).
  // We still accept the parameters for future improvement.
  try {
    const items = await firestoreManager.getAllData('appointments', {});
    return Array.isArray(items) ? items : [];
  } catch (error) {
    throw error;
  }
};

module.exports = listAppointments;
