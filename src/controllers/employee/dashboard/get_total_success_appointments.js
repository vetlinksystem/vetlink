const getTotalSuccessReservationModel = require('../../../models/employee/dashboard/get_total_success_appointments');

const getTotalSuccessReservation = async (req, res) => {

    const modelResponse = await getTotalSuccessReservationModel();

    try {
        return res.send({ "total": modelResponse });
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalSuccessReservation;