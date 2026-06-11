const sendMessage = require('../../../models/client/chats/send_message');

const sendMessageController = async (req, res) => {
    try {
        const result = await sendMessage(req.user.id, req.params.id, req.body || {});

        if (!result || result.success === false) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'Failed to send message.'
            });
        }

        return res.json(result);
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while sending message.',
            error: error.message
        });
    }
};

module.exports = sendMessageController;
