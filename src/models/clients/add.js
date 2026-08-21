const firestoreManager = require ('../../fb/firestore_manager');
const utils = require('../../utilities/utils');
const { generateClientId } = require('../../utilities/idGenerator');
const {
    validatePersonPayload,
    splitLegacyName
} = require('../../utilities/personUtils');

const addClient = async (req_body) => {

    const body = { ...(req_body || {}) };

    // Back-compat: callers that still send a single flat `name`.
    if (!body.firstName && !body.lastName && body.name) {
        Object.assign(body, splitLegacyName(body.name));
    }

    // 1NF name fields + required contact details (see utilities/personUtils.js)
    const check = validatePersonPayload(body, { requireContact: true });
    if (!check.ok) {
        return { success: false, message: check.message };
    }

    // Use sequential, human-friendly IDs (c1001, c1002, ...)
    const id = await generateClientId();

    const clientData = {
        id,
        ...check.data,   // firstName / middleName / lastName / name / email / number / address / dateOfBirth / sex
        password: body.password,
        createdAt: new Date().toISOString(),
    };

    try {
        const response = await firestoreManager.addData('clients', clientData);
        return {
            success: !!response,
            id,
            client: clientData
        };
    } catch (error) {
        throw error;
    }

};

module.exports = addClient;
