const cancelProposal = require('../../../models/client/breeding/cancel');

const cancelController = async (req, res) => {
    try {
        const result = await cancelProposal(req.user.id, req.body || {});

        if (!result || result.success === false) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'Failed to cancel proposal.'
            });
        }

        return res.json({
            success: true,
            message: 'Proposal withdrawn.',
            id: result.id,
            status: result.status
        });
    } catch (error) {
        console.error('Error cancelling proposal:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while cancelling proposal.',
            error: error.message
        });
    }
};

module.exports = cancelController;
