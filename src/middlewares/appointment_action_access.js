const { requirePermission } = require('./require_permission');

/**
 * Appointment write access.
 *
 * The clinic's roles note distinguishes two things staff can and cannot do:
 *   Staff        — "can only add/edit appointments but cannot take action"
 *   Veterinarian — full control, including confirm / cancel / complete
 *
 * "Taking action" means changing the appointment's status, so the required permission
 * depends on the request body: a status change needs `appointments.act` (vet only),
 * while editing the date, time, purpose or notes needs `appointments.edit`.
 */
const ACTION_FIELDS = ['status'];

module.exports = function appointmentWriteAccess(req, res, next) {
  // Only employee accounts are role-checked here. Clients use /client/appointments,
  // which is already scoped to their own records.
  if (!req.user || req.user.type !== 'employee') return next();

  const body = req.body || {};
  const isAction = ACTION_FIELDS.some((f) => body[f] !== undefined);

  const guard = isAction
    ? requirePermission('appointments.act')
    : requirePermission('appointments.edit');

  return guard(req, res, next);
};
