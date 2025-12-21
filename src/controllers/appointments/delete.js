const deleteAppointmentModel = require('../../models/appointments/delete');

const deleteAppointmentController = async(req, res) => {

    const modelResponse = await deleteAppointmentModel(req.body);

    try {
        if (modelResponse) {
            return res.send("Appointment deleted successfully!");
        } else {
            return res.send("Failed to delete Appointment!");
        }
    } catch (error) {
        throw error;
    }
}

module.exports = deleteAppointmentController;