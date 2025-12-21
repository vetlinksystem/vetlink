const deletePetModel = require('../../models/pets/delete');

const deletePetsController = async (req, res) => {
    try {
        const result = await deletePetModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete Pet!'
            });
        }

        return res.json({
            success: true,
            message: 'Pet deleted successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while deleting Pet!',
            error: error.message
        });
    }
};

module.exports = deletePetsController;
