const getTotalPendingReservationModel = require('../../../models/employee/dashboard/get_total_pending_appointments');

const getTotalPendingReservation = async (req, res) => {

    const modelResponse = await getTotalPendingReservationModel();

    try {
        return res.send({ "total": modelResponse });
    } catch (error) {
        throw error;
    }

}

module.exports = getTotalPendingReservation;