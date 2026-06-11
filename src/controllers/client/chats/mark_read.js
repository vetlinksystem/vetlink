const markConversationRead = require('../../../models/client/chats/mark_read');

const markReadController = async (req, res) => {
    try {
        const result = await markConversationRead(req.user.id, req.params.id);

        if (!result || result.success === false) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'Failed to mark conversation read.'
            });
        }

        return res.json(result);
    } catch (error) {
        console.error('Error marking conversation read:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while marking conversation read.',
            error: error.message
        });
    }
};

module.exports = markReadController;
