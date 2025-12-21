const deleteEmployeeModel = require('../../models/employees/delete');

const deleteEmployeeController = async (req, res) => {
    try {
        const result = await deleteEmployeeModel(req.body);
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
