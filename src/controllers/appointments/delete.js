const deleteAppointmentModel = require('../../models/appointments/delete');

const deleteAppointmentController = async (req, res) => {
    try {
        const id = String(req.body?.id || '').trim();
        if (!id) {
            return res.status(400).json({ success: false, message: 'Appointment id is required.' });
        }

        const result = await deleteAppointmentModel({ id });
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
