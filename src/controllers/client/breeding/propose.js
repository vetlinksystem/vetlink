const proposeBreeding = require('../../../models/client/breeding/propose');

const proposeController = async (req, res) => {
    try {
        const result = await proposeBreeding(req.user.id, req.body || {});

        if (!result || result.success === false) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'Failed to send breeding proposal.',
                existingId: result?.existingId
            });
        }

        return res.json({
            success: true,
            message: 'Breeding proposal sent! The other owner has been notified.',
            id: result.id,
            record: result.record
        });
    } catch (error) {
        console.error('Error proposing breeding:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while sending breeding proposal.',
            error: error.message
        });
    }
};

module.exports = proposeController;
