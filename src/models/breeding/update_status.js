// src/models/breeding/update_status.js
const firestoreManager = require('../../fb/firestore_manager');

const updateStatus = async (req_body) => {

    const {
        id,
        ownerId,
        decision  // 'approve' | 'reject'
    } = req_body;

    if (!id || !ownerId || !decision) {
        return {
            success: false,
            message: 'id, ownerId, and decision are required.'
        };
    }

    // Get existing record
    const list = await firestoreManager.getAllData('breeding', { id });
    const record = list && list[0];

    if (!record) {
        return {
            success: false,
            message: 'Breeding record not found.'
        };
    }

    let { ownerAId, ownerBId, ownerAApproved, ownerBApproved } = record;

    ownerAApproved = !!ownerAApproved;
    ownerBApproved = !!ownerBApproved;

    let status = record.status || 'pending';

    // Handle decisions
    if (decision === 'reject') {
        status = 'rejected';
        // Optionally you could track who rejected:
        // record.rejectedBy = ownerId;
        const patch = {
            id,
            status
        };
        const response = await firestoreManager.updatePartialData('breeding', patch);

        return {
            success: !!response,
            id,
            status
        };
    }

    if (decision === 'approve') {
        if (ownerId === ownerAId) {
            ownerAApproved = true;
        } else if (ownerId === ownerBId) {
            ownerBApproved = true;
        } else {
            return {
                success: false,
                message: 'Owner is not part of this breeding request.'
            };
        }

        // Only approved if BOTH say yes
        if (ownerAApproved && ownerBApproved) {
            status = 'approved';
        } else {
            status = 'pending';
        }

        const patch = {
            id,
            ownerAApproved,
            ownerBApproved,
            status
        };

        const response = await firestoreManager.updatePartialData('breeding', patch);

        return {
            success: !!response,
            id,
            status,
            ownerAApproved,
            ownerBApproved
        };
    }

    return {
        success: false,
        message: 'Unknown decision value.'
    };
};

module.exports = updateStatus;
