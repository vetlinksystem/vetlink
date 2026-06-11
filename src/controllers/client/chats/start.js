const startConversation = require('../../../models/client/chats/start');

const startConversationController = async (req, res) => {
    try {
        const result = await startConversation(req.user.id, req.body || {});

        if (!result || result.success === false) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'Failed to start conversation.'
            });
        }

        return res.json(result);
    } catch (error) {
        console.error('Error starting conversation:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while starting conversation.',
            error: error.message
        });
    }
};

module.exports = startConversationController;
