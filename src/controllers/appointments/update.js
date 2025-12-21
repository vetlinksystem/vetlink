const updateAppointmentModel = require('../../models/appointments/update');

const updateAppointmentController = async (req, res) => {

    const modelResponse = await updateAppointmentModel(req.body);

    try {
        if (modelResponse) {
            return res.send('Appointment update successfully!')
        } else {
            return res.send("Failed to update Appointment!")
        }
    } catch (error) {
        throw error;
    }

}

module.exports = updateAppointmentController;