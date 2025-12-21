const updateEmployeeModel = require('../../models/employees/update');

const updateEmployeeController = async (req, res) => {
    try {
        const result = await updateEmployeeModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update Employee!'
            });
        }

        return res.json({
            success: true,
            message: 'Employee updated successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating Employee!',
            error: error.message
        });
    }
};

module.exports = updateEmployeeController;
