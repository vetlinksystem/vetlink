const firestoreManager = require('../../../fb/firestore_manager');

const updateEmployeeSelf = async (employeeId, body) => {
  if (!employeeId) {
    return { success: false, message: 'Missing employee id.' };
  }

  const {
    name,
    email,
    number,
    password,
    position,
  } = body || {};

  const updateData = { id: employeeId };

  if (typeof name     !== 'undefined') updateData.name     = name;
  if (typeof email    !== 'undefined') updateData.email    = email;
  if (typeof number   !== 'undefined') updateData.number   = number;
  if (typeof password !== 'undefined' && password !== '')  updateData.password = password;
  if (typeof position !== 'undefined') updateData.position = position;

  try {
    const ok = await firestoreManager.updatePartialData('employees', updateData);
    if (!ok) {
      return { success: false, message: 'Failed to update profile.' };
    }
    
    const list = await firestoreManager.getAllData('employees', { id: employeeId });
    const employee = Array.isArray(list) ? list.find(e => e.id === employeeId) : null;

    return {
      success: true,
      employee: employee || updateData
    };
  } catch (error) {
    throw error;
  }
};

module.exports = updateEmployeeSelf;
