const firestoreManager = require('../../fb/firestore_manager');

const STATUSES = ['Active', 'On Leave', 'Inactive'];

/**
 * PUT /employees/status  { id, status }
 *
 * Deactivate (or reactivate) an employee account. The record is kept — an inactive
 * employee simply cannot sign in — so their past appointments and records stay intact.
 * Admin only (employees.manage), and an admin cannot deactivate their own account.
 */
const setEmployeeStatusController = async (req, res) => {
    try {
        const id = String(req.body?.id || '').trim();
        const status = String(req.body?.status || '').trim();

        if (!id || !STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: 'A valid employee id and status are required.' });
        }

        if (status === 'Inactive' && String(req.user?.id) === id) {
            return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
        }

        const current = await firestoreManager.getData('employees', id);
        if (!current) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        const ok = await firestoreManager.updatePartialData('employees', { id, status });
        if (!ok) {
            return res.status(500).json({ success: false, message: 'Failed to update the employee status.' });
        }

        return res.json({ success: true, id, status });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating the employee status.',
            error: error.message
        });
    }
};

module.exports = setEmployeeStatusController;
