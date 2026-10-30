const deleteEmployeeModel = require('../../models/employees/delete');

const deleteEmployeeController = async (req, res) => {
    try {
        const id = String(req.body?.id || '').trim();
        if (!id) {
            return res.status(400).json({ success: false, message: 'Employee id is required.' });
        }
        if (String(req.user?.id) === id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        }

        const result = await deleteEmployeeModel({ id });
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete Employee!'
            });
        }

        return res.json({
            success: true,
            message: 'Employee deleted successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while deleting Employee!',
            error: error.message
        });
    }
};

module.exports = deleteEmployeeController;
