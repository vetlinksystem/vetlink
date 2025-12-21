const firestoreManager = require('../../../fb/firestore_manager');

const getEmployeeSelf = async (employeeId) => {
  if (!employeeId) {
    return { success: false, message: 'Missing employee id.' };
  }

  try {
    const list = await firestoreManager.getAllData('employees', { id: employeeId });
    const employee = Array.isArray(list) ? list.find(e => e.id === employeeId) : null;

    if (!employee) {
      return { success: false, message: 'Employee not found.' };
    }

    const { password, ...safe } = employee;

    return {
      success: true,
      employee: safe
    };
  } catch (error) {
    throw error;
  }
};

module.exports = getEmployeeSelf;
