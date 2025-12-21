const addAppointmentModel = require ('../../models/appointments/add');

const addAppointmentController = async (req, res) => {

    const modelResponse = await addAppointmentModel(req.body);

    try { 
        if (modelResponse) {
            return res.send("Appointment added successfully!");
        } else {
            return res.send("Failed to add Appointment!");
        }
    } catch (error) {
        throw error;
    }

}

module.exports = addAppointmentController;