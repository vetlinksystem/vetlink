const deleteAppointmentModel = require('../../models/appointments/delete');

const deleteAppointmentController = async (req, res) => {
    try {
        const result = await deleteAppointmentModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete Appointment!'
            });
        }

        return res.json({
            success: true,
            message: 'Appointment deleted successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while deleting Appointment!',
            error: error.message
        });
    }
};

module.exports = deleteAppointmentController;
