const getAllReservationsModel = require('../../models/reservations/get_all');

const getAllReservationsController = async (req, res) => {
    try {
        const items = await getAllReservationsModel(req.query || {});

        return res.json({
            success: true,
            items,
            total: Array.isArray(items) ? items.length : 0
        });
    } catch (error) {
        console.error('Error fetching reservations:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to load reservations.',
            error: error.message
        });
    }
};

module.exports = getAllReservationsController;
