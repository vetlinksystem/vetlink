const addEmployeeModel = require('../../models/employees/add');

const addEmployeeController = async (req, res) => {
    try {
        const result = await addEmployeeModel(req.body);

        if (!result || result.success === false) {
            // A validation failure is the caller's fault, not a server error —
            // the form shows `message`, so it has to survive.
            return res.status(result && result.message ? 400 : 500).json({
                success: false,
                message: (result && result.message) || 'Failed to add Employee!'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Employee added successfully!',
            id: result.id,
            employee: result.employee
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while adding Employee!',
            error: error.message
        });
    }
};

module.exports = addEmployeeController;
