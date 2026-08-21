// src/utilities/roles.js
// Role definitions and the permission matrix for employee accounts.
//
// Taken from the clinic's "Roles and Access" notes:
//
//   Admin        — Analytics; Registered Customer (view/delete); Manage Pets;
//                  Manage Employees (add/delete/edit); Schedule; Update Profile;
//                  Breeding: can VIEW matches and status but CANNOT take actions.
//   Staff        — Analytics; Registered Customer (add/edit/view); Manage Pets; Schedule;
//                  Appointments: can add/edit but CANNOT take action (confirm/cancel/complete);
//                  Breeding: can VIEW matches and status but CANNOT take actions.
//   Veterinarian — Analytics; Registered Customer (view only); Manage Pets; Schedule;
//                  Appointments (full); Breeding Matching (full — the final decision-maker);
//                  Medical Records (add/edit); Update Profile.
//
// The veterinarian is deliberately the only role that can decide a breeding match.
// Previously admin and vet shared one middleware, so an admin could approve pairings.

const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  VET: 'veterinarian'
};

/**
 * Work out an employee's role from their document.
 * `position`/`role` are free text in Firestore ("Veterinarian", "Admin Staff", …),
 * and `isAdmin` is a legacy boolean, so both are considered.
 */
// Titles that contain "vet" but are NOT the licensed veterinarian who signs off on
// breeding decisions and medical records. Matching on "vet" alone would promote a
// "Vet Assistant" to decision-maker.
const SUPPORT_TITLES = /assistant|aide|tech|technician|intern|trainee|apprentice|receptionist|secretary|clerk/;

const resolveRole = (employee) => {
  if (!employee) return null;
  const pos = String(employee.position || employee.role || '').toLowerCase();

  // Vet is checked first so a "Veterinarian / Admin" gets the clinical role,
  // but support titles fall through to staff.
  if (pos.includes('vet') && !SUPPORT_TITLES.test(pos)) return ROLES.VET;
  if (employee.isAdmin === true || pos.includes('admin') || pos.includes('owner')) return ROLES.ADMIN;
  if (pos) return ROLES.STAFF;

  // No position recorded — treat as staff, the least privileged employee role.
  return ROLES.STAFF;
};

// permission -> roles allowed
const MATRIX = {
  // Analytics dashboard — all three roles
  'analytics.view':        [ROLES.ADMIN, ROLES.STAFF, ROLES.VET],

  // Registered Customers
  'customers.view':        [ROLES.ADMIN, ROLES.STAFF, ROLES.VET],
  'customers.add':         [ROLES.STAFF],
  'customers.edit':        [ROLES.STAFF],
  'customers.delete':      [ROLES.ADMIN],

  // Employees — admin only
  'employees.view':        [ROLES.ADMIN],
  'employees.manage':      [ROLES.ADMIN],

  // Pets
  'pets.view':             [ROLES.ADMIN, ROLES.STAFF, ROLES.VET],
  'pets.manage':           [ROLES.ADMIN, ROLES.STAFF, ROLES.VET],

  // Schedule (calendar)
  'schedule.view':         [ROLES.ADMIN, ROLES.STAFF, ROLES.VET],

  // Appointments — staff may create/edit, but only a vet may confirm/cancel/complete
  'appointments.view':     [ROLES.ADMIN, ROLES.STAFF, ROLES.VET],
  'appointments.edit':     [ROLES.STAFF, ROLES.VET],
  'appointments.act':      [ROLES.VET],

  // Medical records — veterinarian/admin write, staff view+print, owner views their own
  'records.view':          [ROLES.ADMIN, ROLES.STAFF, ROLES.VET],
  'records.print':         [ROLES.ADMIN, ROLES.STAFF, ROLES.VET],
  'records.manage':        [ROLES.ADMIN, ROLES.VET],

  // Breeding — everyone can watch, only the vet decides
  'breeding.view':         [ROLES.ADMIN, ROLES.STAFF, ROLES.VET],
  'breeding.decide':       [ROLES.VET],

  // Own profile
  'profile.edit':          [ROLES.ADMIN, ROLES.STAFF, ROLES.VET]
};

const can = (role, permission) => {
  const allowed = MATRIX[permission];
  if (!allowed) return false;
  return allowed.includes(role);
};

/**
 * Every permission a role holds — sent to the front-end so it can hide the
 * buttons a user is not allowed to press (the server still enforces it).
 */
const permissionsFor = (role) =>
  Object.keys(MATRIX).filter((p) => can(role, p));

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.STAFF]: 'Staff',
  [ROLES.VET]: 'Veterinarian'
};

module.exports = {
  ROLES,
  ROLE_LABELS,
  MATRIX,
  resolveRole,
  can,
  permissionsFor
};
