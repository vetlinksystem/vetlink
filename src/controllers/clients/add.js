const addClientModel = require('../../models/clients/add');

const addClientsController = async (req, res) => {
    try {
        const result = await addClientModel(req.body);
        const ok = result && (typeof result === 'object' ? result.success !== false : true);

        if (!ok) {
            return res.status(500).json({
                success: false,
                message: 'Failed to add Client!'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Client added successfully!',
            id: result.id,
            client: result.client
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while adding Client!',
            error: error.message
        });
    }
};

module.exports = addClientsController;
