const firestoreManager = require('../../fb/firestore_manager');
const utils = require ('../../utilities/utils');

const addBreeding = async (req_body) => {

    const {
        petAId,
        petBId,
        notes
    } = req_body;

    const requestedAt = () => {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');

        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        hours = String(hours).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes} ${ampm}`;
    }

    const breedingData = {
        id: "b123",
        petAId,
        petBId,
        notes,
        status: 'pending',
        requestedAt: requestedAt()
    }
    
    try {
        const response = await firestoreManager.addData('breeding', breedingData)
        return response;
    } catch (error) {
        throw error;
    }
    
}

module.exports = addBreeding;