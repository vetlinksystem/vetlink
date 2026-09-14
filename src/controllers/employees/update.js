const updateEmployeeModel = require('../../models/employees/update');

const updateEmployeeController = async (req, res) => {
    try {
        const result = await updateEmployeeModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            // A validation failure is the caller's fault, not a server error —
            // the form shows `message`, so it has to survive.
            return res.status(result && result.message ? 400 : 500).json({
                success: false,
                message: (result && result.message) || 'Failed to update Employee!'
            });
        }

        return res.json({
            success: true,
            message: 'Employee updated successfully!',
            employee: (result && result.employee) || undefined
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
