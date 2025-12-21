const addBreedingModel = require('../../models/breeding/add');

const addBreedingController = async (req, res) => {
    try {
        const result = await addBreedingModel(req.body);

        if (!result || result.success === false) {
            return res.status(500).json({
                success: false,
                message: result?.message || 'Failed to add breeding record!'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Breeding record added successfully!',
            id: result.id,
            record: result.record
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while adding breeding record!',
            error: error.message
        });
    }
};

module.exports = addBreedingController;
