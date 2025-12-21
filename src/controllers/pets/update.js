const updatePetModel = require('../../models/pets/update');

const updatePetsController = async (req, res) => {
    try {
        const result = await updatePetModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update Pet!'
            });
        }

        return res.json({
            success: true,
            message: 'Pet updated successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating Pet!',
            error: error.message
        });
    }
};

module.exports = updatePetsController;
