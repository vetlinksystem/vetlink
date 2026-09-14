const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');
const { generateEmployeeId } = require('../../utilities/idGenerator');
const {
    clean,
    validatePersonPayload,
    splitLegacyName
} = require('../../utilities/personUtils');

// Staff accounts are real logins, so they follow the same password rule
// the client registration form enforces (see routers/_front-end/login).
const passwordMeetsRules = (pw) => {
    const s = String(pw || '');
    return (
        s.length >= 11 &&
        /[A-Z]/.test(s) &&
        /[a-z]/.test(s) &&
        /[0-9]/.test(s) &&
        /[^A-Za-z0-9]/.test(s)
    );
};

const addEmployee = async (req_body) => {

    const body = { ...(req_body || {}) };

    // Back-compat: callers that still send a single flat `name`.
    if (!body.firstName && !body.lastName && body.name) {
        Object.assign(body, splitLegacyName(body.name));
    }

    // Same account details a client supplies when registering: 1NF name fields,
    // required contact number and a complete four-part address.
    const check = validatePersonPayload(body, { requireContact: true });
    if (!check.ok) {
        return { success: false, message: check.message };
    }

    const position = clean(body.position);
    if (!position) {
        return { success: false, message: 'Please choose a role for this employee.' };
    }

    if (!body.password) {
        return { success: false, message: 'A password is required for a new employee account.' };
    }
    if (!passwordMeetsRules(body.password)) {
        return {
            success: false,
            message: 'Password must contain at least: 11 characters, one uppercase, one lowercase, one number, and one special character.'
        };
    }

    // Reject a duplicate login before creating anything.
    const existing = await firestoreManager.getAllData('employees', { email: check.data.email });
    if (Array.isArray(existing) && existing.some(e => String(e.email || '').toLowerCase() === check.data.email)) {
        return { success: false, message: 'That email already belongs to an employee account.' };
    }

    // Use sequential, human-friendly IDs (e1001, e1002, ...)
    const id = await generateEmployeeId();

    const employeeData = {
        id,
        ...check.data,   // firstName / middleName / lastName / name / email / number / address parts / dateOfBirth / sex
        password: body.password,
        position,
        isAdmin: utils.toBoolean(body.isAdmin),
        status: clean(body.status) || 'Active',
        dateHired: clean(body.dateHired),
        createdAt: new Date().toISOString()
    };

    try {
        const response = await firestoreManager.addData('employees', employeeData);
        const { password, ...safeEmployee } = employeeData;
        return {
            success: !!response,
            id,
            employee: safeEmployee
        };
    } catch (error) {
        throw error;
    }
};

module.exports = addEmployee;
