const getMessages = require('../../../models/client/chats/get_messages');

const getMessagesController = async (req, res) => {
    try {
        const result = await getMessages(req.user.id, req.params.id, {
            after: req.query.after
        });

        if (!result || result.success === false) {
            return res.status(404).json({
                success: false,
                message: result?.message || 'Conversation not found.'
            });
        }

        return res.json(result);
    } catch (error) {
        console.error('Error loading messages:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while loading messages.',
            error: error.message
        });
    }
};

module.exports = getMessagesController;
