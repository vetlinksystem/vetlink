const updateStatusModel = require('../../models/breeding/update_status');

const updateBreedingStatusController = async (req, res) => {
    try {
        // Client calls may omit ownerId; derive from session
        const body = { ...(req.body || {}) };
        if (!body.ownerId) {
            body.ownerId = req.user?.id || req.user?.uid;
        }

        const result = await updateStatusModel(body);

        if (!result || result.success === false) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'Failed to update breeding status!'
            });
        }

        return res.json({
            success: true,
            message: 'Breeding status updated successfully!',
            id: result.id,
            status: result.status,
            ownerAApproved: result.ownerAApproved,
            ownerBApproved: result.ownerBApproved
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating breeding status!',
            error: error.message
        });
    }
};

module.exports = updateBreedingStatusController;
