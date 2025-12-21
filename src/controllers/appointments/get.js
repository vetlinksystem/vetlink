const getAppointmentModel = require('../../models/appointments/get');

const getAppointmentController = async (req, res) => {

    const modelResponse = await getAppointmentModel(req.body);

    try {
        return res.send(modelResponse);
    } catch (error) {
        throw error;
    }

}

module.exports = getAppointmentController;