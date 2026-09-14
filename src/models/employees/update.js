const firestoreManager = require('../../fb/firestore_manager');
const utils = require('../../utilities/utils');
const {
    clean,
    validatePersonPayload,
    splitLegacyName
} = require('../../utilities/personUtils');

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

const updateEmployee = async (req_body) => {

    const body = { ...(req_body || {}) };
    const id = clean(body.id);

    if (!id) {
        return { success: false, message: 'Missing employee id.' };
    }

    // Back-compat: callers that still send a single flat `name`.
    if (!body.firstName && !body.lastName && body.name) {
        Object.assign(body, splitLegacyName(body.name));
    }

    const check = validatePersonPayload(body, { requireContact: true });
    if (!check.ok) {
        return { success: false, message: check.message };
    }

    const position = clean(body.position);
    if (!position) {
        return { success: false, message: 'Please choose a role for this employee.' };
    }

    // An empty password means "leave the current one alone".
    if (body.password && !passwordMeetsRules(body.password)) {
        return {
            success: false,
            message: 'Password must contain at least: 11 characters, one uppercase, one lowercase, one number, and one special character.'
        };
    }

    // updateData() replaces the whole document, so read what is stored first —
    // otherwise fields this form does not send (createdAt, avatar, …) are wiped.
    const current = await firestoreManager.getData('employees', id);
    if (!current) {
        return { success: false, message: 'Employee not found.' };
    }

    // Another employee must not be able to take over this email.
    const others = await firestoreManager.getAllData('employees', { email: check.data.email });
    if (Array.isArray(others) && others.some(e =>
        String(e.email || '').toLowerCase() === check.data.email && clean(e.id) !== id)) {
        return { success: false, message: 'That email already belongs to another employee account.' };
    }

    const employeeData = {
        ...current,
        id,
        ...check.data,
        position,
        isAdmin: utils.toBoolean(body.isAdmin),
        status: clean(body.status) || current.status || 'Active',
        dateHired: clean(body.dateHired) || current.dateHired || '',
        updatedAt: new Date().toISOString()
    };

    if (body.password) {
        employeeData.password = body.password;
    }

    try {
        const response = await firestoreManager.updateData('employees', employeeData);
        const { password, ...safeEmployee } = employeeData;
        return {
            success: !!response,
            employee: safeEmployee
        };
    } catch (error) {
        throw error;
    }
};

module.exports = updateEmployee;
