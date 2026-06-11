// src/models/breeding/update_status.js
// Legacy endpoint kept for older app builds (PUT /breeding/update-status).
// - Client-proposed records (proposedBy === 'client') are routed through the
//   new respond flow (accept → "accepted", waiting for clinic approval).
// - Old clinic-proposed records keep the original dual-approval behavior.
const firestoreManager = require('../../fb/firestore_manager');
const respondToProposal = require('../client/breeding/respond');

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
    const record = await firestoreManager.getData('breeding', String(id));

    if (!record) {
        return {
            success: false,
            message: 'Breeding record not found.'
        };
    }

    // New flow: proposals made by clients
    if (record.proposedBy === 'client') {
        return await respondToProposal(ownerId, { id, decision });
    }

    // ===== Legacy flow (clinic-proposed records) =====
    let { ownerAId, ownerBId, ownerAApproved, ownerBApproved } = record;

    ownerAApproved = !!ownerAApproved;
    ownerBApproved = !!ownerBApproved;

    let status = record.status || 'pending';

    if (decision === 'reject') {
        status = 'rejected';
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
