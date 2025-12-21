const deleteClientModel = require('../../models/clients/delete');

const deleteClientController = async (req, res) => {
    try {
        const result = await deleteClientModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete Client!'
            });
        }

        return res.json({
            success: true,
            message: 'Client deleted successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while deleting Client!',
            error: error.message
        });
    }
};

module.exports = deleteClientController;
