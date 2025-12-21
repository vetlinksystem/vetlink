const updateReservationModel = require('../../models/reservations/update');

const updateReservationController = async (req, res) => {
    const { id } = req.params;

    try {
        const modelResponse = await updateReservationModel(id, req.body || {});

        if (!modelResponse || modelResponse.success === false) {
            return res.status(400).json({
                success: false,
                message: modelResponse?.message || 'Unable to update reservation.'
            });
        }

        return res.json({
            success: true,
            reservation: modelResponse.reservation
        });
    } catch (error) {
        console.error('Error updating reservation:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating reservation.',
            error: error.message
        });
    }
};

module.exports = updateReservationController;
