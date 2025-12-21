// src/models/breeding/add.js
const firestoreManager = require('../../fb/firestore_manager');
const { generateBreedingId } = require('../../utilities/idGenerator');
const addNotification = require('../notifications/add');

const addBreeding = async (req_body) => {

    const {
        petAId,
        petBId,
        notes
    } = req_body;

    // Helper to format timestamp
    const requestedAt = () => {
        const now = new Date();

        const year   = now.getFullYear();
        const month  = String(now.getMonth() + 1).padStart(2, '0');
        const day    = String(now.getDate()).padStart(2, '0');
        const hour   = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    };

    // Get pets to know owners
    const petsA = await firestoreManager.getAllData('pets', { id: petAId });
    const petsB = await firestoreManager.getAllData('pets', { id: petBId });

    const petA = petsA && petsA[0];
    const petB = petsB && petsB[0];

    if (!petA || !petB) {
        return {
            success: false,
            message: 'One or both pets not found.'
        };
    }

    // Use sequential, human-friendly IDs (b1001, b1002, ...)
    const id = await generateBreedingId();

    const breedingData = {
        id,
        petAId,
        petBId,
        notes: notes || '',
        status: 'pending',
        requestedAt: requestedAt(),
        ownerAId: petA.ownerId,
        ownerBId: petB.ownerId,
        ownerAApproved: false,
        ownerBApproved: false
    };
    
    try {
        const response = await firestoreManager.addData('breeding', breedingData);

        // Create notifications for both owners (client-side inbox)
        if (response) {
            const title = 'Breeding proposal';
            const msgA = `Clinic proposed breeding for your pet (${petA.name}) with ${petB.name}.`;
            const msgB = `Clinic proposed breeding for your pet (${petB.name}) with ${petA.name}.`;

            // Fire-and-forget (do not block main flow if notif creation fails)
            addNotification({
                clientId: petA.ownerId,
                type: 'breeding_proposal',
                title,
                message: msgA,
                payload: { breedingId: id, petAId, petBId }
            }).catch(()=>{});

            if (String(petB.ownerId) !== String(petA.ownerId)) {
                addNotification({
                    clientId: petB.ownerId,
                    type: 'breeding_proposal',
                    title,
                    message: msgB,
                    payload: { breedingId: id, petAId, petBId }
                }).catch(()=>{});
            }
        }

        return {
            success: !!response,
            id,
            record: breedingData
        };
    } catch (error) {
        throw error;
    }
    
};

module.exports = addBreeding;
