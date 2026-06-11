const getBreedingCandidates = require('../../../models/client/breeding/candidates');

const candidatesController = async (req, res) => {
    try {
        const petId = req.query.petId || req.body?.petId;
        if (!petId) {
            return res.status(400).json({ success: false, message: 'petId is required.' });
        }

        const result = await getBreedingCandidates(req.user.id, petId);

        if (!result || result.success === false) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'Unable to load breeding candidates.',
                matchedBreedingId: result?.matchedBreedingId
            });
        }

        return res.json(result);
    } catch (error) {
        console.error('Error loading breeding candidates:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while loading breeding candidates.',
            error: error.message
        });
    }
};

module.exports = candidatesController;
