const addReservationModel = require('../../models/reservations/add');

const addReservationController = async (req, res) => {
    try {
        const modelResponse = await addReservationModel(req.body);

        if (!modelResponse || modelResponse.success === false) {
            return res.status(400).json({
                success: false,
                message: modelResponse?.message || 'Unable to create reservation.'
            });
        }

        return res.json({
            success: true,
            reservation: modelResponse.reservation
        });
    } catch (error) {
        console.error('Error creating reservation:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while creating reservation.',
            error: error.message
        });
    }
};

module.exports = addReservationController;
