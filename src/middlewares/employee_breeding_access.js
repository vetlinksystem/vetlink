const firestoreManager = require('../fb/firestore_manager');

/**
 * Allow only Veterinarian and Admin employees to access breeding endpoints.
 * - Admin: employee.isAdmin === true OR position/role contains "admin"
 * - Veterinarian: position/role contains "vet" (e.g., "veterinarian")
 */
module.exports = async function ensureEmployeeBreedingAccess(req, res, next) {
  try {
    const u = req.user;
    if (!u || u.type !== 'employee') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const emp = await firestoreManager.getData('employees', u.id);
    const pos = String(emp?.position || emp?.role || '').toLowerCase();
    const isAdmin = !!emp?.isAdmin || pos.includes('admin');
    const isVet = pos.includes('vet');

    if (!isAdmin && !isVet) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Expose employee details for downstream handlers if needed
    req.employee = emp;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
