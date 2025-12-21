const getAllAppointmentModel = require('../../models/appointments/get_all');

const getAllAppointmentController = async (req, res) => {

    const modelResponse = await getAllAppointmentModel(req.body);

    try {
        return res.send(modelResponse);
    } catch (error) {
        throw error;
    }

}

module.exports = getAllAppointmentController;