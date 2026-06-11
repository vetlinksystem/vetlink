const adminDecisionModel = require('../../models/breeding/admin_decision');

const adminDecisionController = async (req, res) => {
    try {
        // req.employee is attached by ensureEmployeeBreedingAccess
        const result = await adminDecisionModel(req.employee || req.user, req.body || {});

        if (!result || result.success === false) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'Failed to update breeding record.'
            });
        }

        return res.json({
            success: true,
            message: result.status === 'approved'
                ? `Breeding approved. Both pets are now reserved.${result.cancelledOthers ? ` ${result.cancelledOthers} competing proposal(s) were cancelled.` : ''}`
                : 'Breeding rejected.',
            id: result.id,
            status: result.status,
            cancelledOthers: result.cancelledOthers || 0
        });
    } catch (error) {
        console.error('Error on admin breeding decision:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating breeding record.',
            error: error.message
        });
    }
};

module.exports = adminDecisionController;
