const { requirePermission } = require('./require_permission');

/**
 * Breeding access.
 *
 * This used to be a single check that let admin OR vet do everything, which meant an
 * administrator could approve a breeding pairing. The clinic's roles note is explicit:
 * admin and staff may *view* matches and their status but cannot take actions —
 * the veterinarian is the final decision-maker.
 *
 * So it is now two guards:
 *   canViewBreeding   → admin, staff, veterinarian
 *   canDecideBreeding → veterinarian only
 *
 * The default export stays the "view" guard so any older require() of this module
 * keeps working (read access) rather than silently granting decision rights.
 */
const canViewBreeding = requirePermission('breeding.view');
const canDecideBreeding = requirePermission('breeding.decide');

module.exports = canViewBreeding;
module.exports.canViewBreeding = canViewBreeding;
module.exports.canDecideBreeding = canDecideBreeding;
