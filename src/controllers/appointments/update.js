const updateAppointmentModel = require('../../models/appointments/update');

const updateAppointmentController = async (req, res) => {
    try {
        const result = await updateAppointmentModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update Appointment!'
            });
        }

        return res.json({
            success: true,
            message: 'Appointment updated successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating Appointment!',
            error: error.message
        });
    }
};

module.exports = updateAppointmentController;
