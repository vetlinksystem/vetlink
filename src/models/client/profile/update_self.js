const firestoreManager = require('../../../fb/firestore_manager');
const {
  clean,
  composeFullName,
  readNameParts,
  isValidMobile,
  normalizeMobile,
  ADDRESS_PARTS,
  composeAddress,
  readAddressParts
} = require('../../../utilities/personUtils');

// Self-service profile update for a logged-in client.
// Names are stored as 1NF fields (firstName / middleName / lastName); the flat `name`
// is kept in sync as a derived value so existing readers keep working.
// Contact number and address are required — a client cannot blank them out.
const updateClientSelf = async (clientId, body) => {
  if (!clientId) {
    return { success: false, message: 'Missing client id.' };
  }

  const {
    firstName,
    middleName,
    lastName,
    name,
    email,
    number,
    address,
    dateOfBirth,
    sex,
    password   // optional new password
  } = body || {};

  const updateData = { id: clientId };

  // --- Name (1NF) ---
  const touchesSplitName =
    typeof firstName !== 'undefined' ||
    typeof middleName !== 'undefined' ||
    typeof lastName !== 'undefined';

  if (touchesSplitName) {
    // Merge against stored values so a partial edit doesn't wipe the other parts.
    const current = await firestoreManager.getData('clients', String(clientId));
    const existing = readNameParts(current || {});

    const next = {
      firstName: typeof firstName !== 'undefined' ? clean(firstName) : existing.firstName,
      middleName: typeof middleName !== 'undefined' ? clean(middleName) : existing.middleName,
      lastName: typeof lastName !== 'undefined' ? clean(lastName) : existing.lastName
    };

    if (!next.firstName) return { success: false, message: 'First name is required.' };
    if (!next.lastName) return { success: false, message: 'Last name is required.' };

    updateData.firstName = next.firstName;
    updateData.middleName = next.middleName;
    updateData.lastName = next.lastName;
    updateData.name = composeFullName(next); // derived, for back-compat
  } else if (typeof name !== 'undefined') {
    // Legacy callers sending only a flat name: keep it, and backfill the split fields.
    const parts = readNameParts({ name });
    updateData.name = clean(name);
    updateData.firstName = parts.firstName;
    updateData.middleName = parts.middleName;
    updateData.lastName = parts.lastName;
  }

  // --- Contact details (required, validated when provided) ---
  if (typeof email !== 'undefined') {
    const e = clean(email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    updateData.email = e;
  }

  if (typeof number !== 'undefined') {
    const n = clean(number);
    if (!n) return { success: false, message: 'Contact number is required.' };
    if (!isValidMobile(n)) {
      return { success: false, message: 'Please enter a valid PH mobile number (e.g. 09171234567).' };
    }
    updateData.number = normalizeMobile(n) || n;
  }

  // --- Address (1NF) — same merge-then-derive shape as the name above ---
  const touchesSplitAddress = ADDRESS_PARTS.some(k => typeof body?.[k] !== 'undefined');

  if (touchesSplitAddress) {
    const current = await firestoreManager.getData('clients', String(clientId));
    const existing = readAddressParts(current || {});

    const next = {};
    ADDRESS_PARTS.forEach(k => {
      next[k] = typeof body[k] !== 'undefined' ? clean(body[k]) : existing[k];
    });

    const missing = ADDRESS_PARTS.filter(k => !next[k]);
    if (missing.length) {
      const LABELS = {
        street: 'house/street',
        barangay: 'barangay',
        city: 'city/municipality',
        province: 'province'
      };
      return {
        success: false,
        message: `Please complete your address — missing: ${missing.map(k => LABELS[k]).join(', ')}.`
      };
    }

    Object.assign(updateData, next);
    updateData.address = composeAddress(next); // derived, for back-compat
  } else if (typeof address !== 'undefined') {
    // Legacy callers sending only a flat address: keep it, and backfill the parts.
    const a = clean(address);
    if (!a) return { success: false, message: 'Complete address is required.' };
    const parts = readAddressParts({ address: a });
    updateData.address = a;
    Object.assign(updateData, parts);
  }

  if (typeof dateOfBirth !== 'undefined') {
    const d = clean(dateOfBirth);
    if (d && Number.isNaN(new Date(d).getTime())) {
      return { success: false, message: 'Please enter a valid date of birth.' };
    }
    if (d && new Date(d) > new Date()) {
      return { success: false, message: 'Date of birth cannot be in the future.' };
    }
    updateData.dateOfBirth = d;
  }

  if (typeof sex !== 'undefined') updateData.sex = clean(sex);

  if (typeof password !== 'undefined' && password !== '') updateData.password = password;

  if (Object.keys(updateData).length <= 1) {
    return { success: false, message: 'No fields to update.' };
  }

  try {
    const ok = await firestoreManager.updatePartialData('clients', updateData);
    if (!ok) {
      return { success: false, message: 'Failed to update profile.' };
    }

    const list = await firestoreManager.getAllData('clients', { id: clientId });
    const client = Array.isArray(list) ? list.find(c => c.id === clientId) : null;

    return {
      success: true,
      client: client || updateData
    };
  } catch (error) {
    throw error;
  }
};

module.exports = updateClientSelf;