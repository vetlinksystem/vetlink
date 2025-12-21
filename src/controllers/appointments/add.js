const addAppointmentModel = require ('../../models/appointments/add');

const addAppointmentController = async (req, res) => {
    try {
        const result = await addAppointmentModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to add Appointment!'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Appointment added successfully!',
            id: result.id,
            appointment: result.appointment
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while adding Appointment!',
            error: error.message
        });
    }
};

module.exports = addAppointmentController;
