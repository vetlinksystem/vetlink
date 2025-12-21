const updateClientModel = require('../../models/clients/update');

const updateClientController = async (req, res) => {
    try {
        const result = await updateClientModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update Client!'
            });
        }

        return res.json({
            success: true,
            message: 'Client updated successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating Client!',
            error: error.message
        });
    }
};

module.exports = updateClientController;
