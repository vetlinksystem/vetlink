// src/utilities/personUtils.js
// Shared helpers for the 1NF person name fields (lastName / firstName / middleName)
// and for validating the now-required contact details.
//
// Background: the registration form used to store a single flat `name` field, which
// violated first normal form. Names are now stored as separate fields, but a derived
// `name` is still written on every save so the many existing readers
// (breeding publicOwner, schedule ownerName, chat, notifications, dashboards)
// keep working without being touched.

const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

/**
 * "Maria Santos Dela Cruz" — the display form used across the system.
 */
const composeFullName = ({ firstName, middleName, lastName } = {}) => {
  return [clean(firstName), clean(middleName), clean(lastName)]
    .filter(Boolean)
    .join(' ');
};

/**
 * "Dela Cruz, Maria S." — used on printed documents and sorted lists.
 */
const composeFormalName = ({ firstName, middleName, lastName } = {}) => {
  const last = clean(lastName);
  const first = clean(firstName);
  const mid = clean(middleName);
  const initial = mid ? ` ${mid.charAt(0).toUpperCase()}.` : '';
  if (!last) return `${first}${initial}`.trim();
  if (!first) return last;
  return `${last}, ${first}${initial}`;
};

/**
 * Best-effort split of a legacy flat name so old client documents can still be
 * rendered in (and edited through) the new split-field UI.
 * Assumes "First [Middle] Last" ordering, which is how the old free-text field was used.
 */
const splitLegacyName = (fullName) => {
  const parts = clean(fullName).split(' ').filter(Boolean);
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1]
  };
};

/**
 * Read name parts off a client/employee document, falling back to a legacy flat name.
 */
const readNameParts = (doc = {}) => {
  const hasSplit = doc.firstName || doc.lastName;
  if (hasSplit) {
    return {
      firstName: clean(doc.firstName),
      middleName: clean(doc.middleName),
      lastName: clean(doc.lastName)
    };
  }
  return splitLegacyName(doc.name || doc.fullName || '');
};

// ===== Address (1NF) =====
// The address had the same problem the name did: one free-text field holding four
// distinct values ("House/Street, Barangay, City/Municipality, Province"). It is now
// stored as separate fields, with a derived flat `address` written on every save so
// existing readers (printed records, profile, reservation table) keep working.

const ADDRESS_PARTS = ['street', 'barangay', 'city', 'province'];

/** "123 Rizal St., Poblacion, Tagbilaran City, Bohol" — the display form. */
const composeAddress = ({ street, barangay, city, province } = {}) =>
  [clean(street), clean(barangay), clean(city), clean(province)]
    .filter(Boolean)
    .join(', ');

/**
 * Best-effort split of a legacy flat address so old client documents can still be
 * rendered in (and edited through) the new split-field UI. The old placeholder asked
 * for comma-separated parts in this order, so that is what we assume.
 * Fewer than 4 parts fill from the right (province is the most reliably present).
 */
const splitLegacyAddress = (address) => {
  const parts = clean(address).split(',').map(p => clean(p)).filter(Boolean);
  const out = { street: '', barangay: '', city: '', province: '' };
  if (!parts.length) return out;
  if (parts.length >= 4) {
    out.street = parts.slice(0, parts.length - 3).join(', ');
    out.barangay = parts[parts.length - 3];
    out.city = parts[parts.length - 2];
    out.province = parts[parts.length - 1];
    return out;
  }
  // A lone value is almost always the town, not the province ("Dujali", "Sto Tomas"),
  // so it pre-fills city rather than province.
  if (parts.length === 1) {
    out.city = parts[0];
    return out;
  }
  // 2–3 parts: assign from the right ("New Corella, Davao del Norte" -> city, province).
  const keys = ADDRESS_PARTS.slice(4 - parts.length);
  keys.forEach((k, i) => { out[k] = parts[i]; });
  return out;
};

/** Read address parts off a document, falling back to a legacy flat address. */
const readAddressParts = (doc = {}) => {
  const hasSplit = ADDRESS_PARTS.some(k => clean(doc[k]));
  if (hasSplit) {
    return {
      street: clean(doc.street),
      barangay: clean(doc.barangay),
      city: clean(doc.city),
      province: clean(doc.province)
    };
  }
  return splitLegacyAddress(doc.address || '');
};

// PH mobile numbers: 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX (separators allowed)
const normalizeMobile = (value) => {
  const digits = String(value ?? '').replace(/[^\d+]/g, '');
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^\+639\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  return null;
};

const isValidMobile = (value) => normalizeMobile(value) !== null;

/**
 * Validate the registration payload. Returns { ok, message, data }.
 * `data` carries the cleaned, normalized fields ready to persist.
 */
const validatePersonPayload = (body = {}, { requireContact = true } = {}) => {
  const firstName = clean(body.firstName);
  const middleName = clean(body.middleName);
  const lastName = clean(body.lastName);
  const email = clean(body.email).toLowerCase();
  const dateOfBirth = clean(body.dateOfBirth);
  const sex = clean(body.sex);
  const rawNumber = clean(body.number);

  // Address: prefer the split fields; fall back to a flat `address` so older
  // callers (and the Android app until it is updated) keep working.
  const sentParts = ADDRESS_PARTS.some(k => clean(body[k]));
  const addressParts = sentParts
    ? {
        street: clean(body.street),
        barangay: clean(body.barangay),
        city: clean(body.city),
        province: clean(body.province)
      }
    : splitLegacyAddress(body.address);
  const address = composeAddress(addressParts);

  if (!firstName) return { ok: false, message: 'First name is required.' };
  if (!lastName) return { ok: false, message: 'Last name is required.' };
  if (!email) return { ok: false, message: 'Email address is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  if (requireContact) {
    if (!rawNumber) return { ok: false, message: 'Contact number is required.' };
    if (!isValidMobile(rawNumber)) {
      return { ok: false, message: 'Please enter a valid PH mobile number (e.g. 09171234567).' };
    }
    // Each address component is required in its own right — that is the point of
    // storing them separately. Callers sending a legacy flat address are still
    // accepted as long as it splits into all four parts.
    const missing = ADDRESS_PARTS.filter(k => !addressParts[k]);
    if (missing.length) {
      const LABELS = {
        street: 'house/street',
        barangay: 'barangay',
        city: 'city/municipality',
        province: 'province'
      };
      return {
        ok: false,
        message: `Please complete your address — missing: ${missing.map(k => LABELS[k]).join(', ')}.`
      };
    }
  } else if (rawNumber && !isValidMobile(rawNumber)) {
    return { ok: false, message: 'Please enter a valid PH mobile number (e.g. 09171234567).' };
  }

  if (dateOfBirth && Number.isNaN(new Date(dateOfBirth).getTime())) {
    return { ok: false, message: 'Please enter a valid date of birth.' };
  }
  if (dateOfBirth && new Date(dateOfBirth) > new Date()) {
    return { ok: false, message: 'Date of birth cannot be in the future.' };
  }

  const number = rawNumber ? (normalizeMobile(rawNumber) || rawNumber) : '';

  return {
    ok: true,
    data: {
      firstName,
      middleName,
      lastName,
      name: composeFullName({ firstName, middleName, lastName }), // derived, for back-compat
      email,
      number,
      ...addressParts,                    // street / barangay / city / province (1NF)
      address,                            // derived, for back-compat
      dateOfBirth,
      sex
    }
  };
};

/**
 * Build the consent block stored on the client document (Data Privacy Act, RA 10173).
 */
const buildConsent = (body = {}) => ({
  privacyPolicy: !!body.consentPrivacy,
  dataPrivacyAct: !!body.consentDpa,
  truthfulInformation: !!body.consentTruthful,
  acceptedAt: new Date().toISOString(),
  policyVersion: '2012-RA10173-v1'
});

const consentIsComplete = (body = {}) =>
  !!body.consentPrivacy && !!body.consentDpa && !!body.consentTruthful;

module.exports = {
  clean,
  composeFullName,
  composeFormalName,
  splitLegacyName,
  readNameParts,
  ADDRESS_PARTS,
  composeAddress,
  splitLegacyAddress,
  readAddressParts,
  normalizeMobile,
  isValidMobile,
  validatePersonPayload,
  buildConsent,
  consentIsComplete
};
