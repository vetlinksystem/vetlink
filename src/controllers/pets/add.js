const addPetModel = require('../../models/pets/add');

const addPetController = async (req, res) => {
    try {
        const result = await addPetModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to add Pet!'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Pet added successfully!',
            id: result.id,
            pet: result.pet
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while adding Pet!',
            error: error.message
        });
    }
};

module.exports = addPetController;
