const getMyProposals = require('../../../models/client/breeding/get_my');

const getMyProposalsController = async (req, res) => {
    try {
        const result = await getMyProposals(req.user.id);
        return res.json(result);
    } catch (error) {
        console.error('Error loading proposals:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while loading breeding proposals.',
            error: error.message
        });
    }
};

module.exports = getMyProposalsController;
