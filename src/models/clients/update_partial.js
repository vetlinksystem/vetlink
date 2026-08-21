const firestoreManager = require('../../fb/firestore_manager');
const {
  clean,
  composeFullName,
  readNameParts,
  isValidMobile,
  normalizeMobile
} = require('../../utilities/personUtils');

// Partial update for clients.
// - Does NOT overwrite password unless a non-empty password is provided.
// - Skips undefined / null fields.
// - Names are stored as 1NF fields (firstName / middleName / lastName); the flat
//   `name` is kept in sync as a derived value so existing readers keep working.
const updateClientPartial = async (req_body = {}) => {
  const {
    id,
    firstName,
    middleName,
    lastName,
    name,
    address,
    email,
    number,
    dateOfBirth,
    sex,
    password
  } = req_body;

  if (!id) {
    return { success: false, message: 'id is required.' };
  }

  const patch = { id: String(id) };

  // --- Name fields (1NF) ---
  const touchesSplitName =
    firstName !== undefined || middleName !== undefined || lastName !== undefined;

  if (touchesSplitName) {
    // Merge against what's stored so a partial name edit doesn't wipe the other parts.
    const current = await firestoreManager.getData('clients', String(id));
    const existing = readNameParts(current || {});

    const next = {
      firstName: firstName !== undefined ? clean(firstName) : existing.firstName,
      middleName: middleName !== undefined ? clean(middleName) : existing.middleName,
      lastName: lastName !== undefined ? clean(lastName) : existing.lastName
    };

    if (!next.firstName) return { success: false, message: 'First name is required.' };
    if (!next.lastName) return { success: false, message: 'Last name is required.' };

    patch.firstName = next.firstName;
    patch.middleName = next.middleName;
    patch.lastName = next.lastName;
    patch.name = composeFullName(next); // derived, for back-compat
  } else if (name !== undefined) {
    // Legacy callers sending only a flat name: keep it, and backfill the split fields.
    const parts = readNameParts({ name });
    patch.name = clean(name);
    patch.firstName = parts.firstName;
    patch.middleName = parts.middleName;
    patch.lastName = parts.lastName;
  }

  // --- Contact details (no longer optional; validated when provided) ---
  if (address !== undefined) {
    const a = clean(address);
    if (!a) return { success: false, message: 'Complete address is required.' };
    patch.address = a;
  }

  if (number !== undefined) {
    const n = clean(number);
    if (!n) return { success: false, message: 'Contact number is required.' };
    if (!isValidMobile(n)) {
      return { success: false, message: 'Please enter a valid PH mobile number (e.g. 09171234567).' };
    }
    patch.number = normalizeMobile(n) || n;
  }

  if (email !== undefined) {
    const e = clean(email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    patch.email = e;
  }

  if (dateOfBirth !== undefined) {
    const d = clean(dateOfBirth);
    if (d && Number.isNaN(new Date(d).getTime())) {
      return { success: false, message: 'Please enter a valid date of birth.' };
    }
    if (d && new Date(d) > new Date()) {
      return { success: false, message: 'Date of birth cannot be in the future.' };
    }
    patch.dateOfBirth = d;
  }

  if (sex !== undefined) patch.sex = clean(sex);

  // Only set password if explicitly provided and non-empty
  if (password !== undefined) {
    const pw = String(password || '').trim();
    if (pw) patch.password = pw;
  }

  if (Object.keys(patch).length <= 1) {
    return { success: false, message: 'No fields to update.' };
  }

  try {
    const ok = await firestoreManager.updatePartialData('clients', patch);
    return ok ? { success: true } : { success: false, message: 'Update failed.' };
  } catch (error) {
    throw error;
  }
};

module.exports = updateClientPartial;
