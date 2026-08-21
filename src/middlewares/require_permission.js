const firestoreManager = require('../fb/firestore_manager');
const { resolveRole, can, permissionsFor, ROLE_LABELS } = require('../utilities/roles');

/**
 * Load the logged-in employee's document and attach their role + permissions.
 * Populates req.employee, req.role and req.permissions.
 *
 * The role lives on the employee document (not in the JWT) so a role change takes
 * effect on the next request instead of waiting for the token to expire.
 */
const loadEmployeeRole = async (req, res, next) => {
  try {
    const u = req.user;
    if (!u || u.type !== 'employee') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const emp = await firestoreManager.getData('employees', String(u.id));
    if (!emp) {
      return res.status(403).json({ success: false, error: 'Employee record not found.' });
    }

    req.employee = emp;
    req.role = resolveRole(emp);
    req.permissions = permissionsFor(req.role);
    next();
  } catch (err) {
    console.error('loadEmployeeRole error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Gate an API route on a permission from utilities/roles.js.
 *
 * requirePermission('breeding.decide')  → veterinarian only
 * requirePermission('breeding.view')    → admin, staff or veterinarian
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    // Reuse an already-loaded role when several guards are chained.
    if (!req.role) {
      let finished = false;
      await loadEmployeeRole(req, res, () => { finished = true; });
      if (!finished) return; // loadEmployeeRole already responded
    }

    if (!can(req.role, permission)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Your role (${ROLE_LABELS[req.role] || req.role}) is not allowed to do this.`,
        requiredPermission: permission
      });
    }

    next();
  };
};

/** Same check, for any of several permissions. */
const requireAnyPermission = (...permissions) => {
  return async (req, res, next) => {
    if (!req.role) {
      let finished = false;
      await loadEmployeeRole(req, res, () => { finished = true; });
      if (!finished) return;
    }

    if (!permissions.some((p) => can(req.role, p))) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Your role (${ROLE_LABELS[req.role] || req.role}) is not allowed to do this.`,
        requiredPermission: permissions.join(' or ')
      });
    }

    next();
  };
};

module.exports = { loadEmployeeRole, requirePermission, requireAnyPermission };
