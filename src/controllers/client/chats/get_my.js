const getMyConversations = require('../../../models/client/chats/get_my');

const getMyConversationsController = async (req, res) => {
    try {
        const result = await getMyConversations(req.user.id);
        return res.json(result);
    } catch (error) {
        console.error('Error loading conversations:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while loading conversations.',
            error: error.message
        });
    }
};

module.exports = getMyConversationsController;
