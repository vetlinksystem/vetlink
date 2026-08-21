// CLIENT PROFILE — API-enabled

const API_GET_PROFILE    = '/client/profile/me';
const API_UPDATE_PROFILE = '/client/profile/me';

const fetchJSON = async (url, options = {}, timeoutMs = 15000) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: ctl.signal,
      ...options
    });
    clearTimeout(t);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    clearTimeout(t);
    console.error('client profile fetch error', err);
    return { ok:false, status:0, body:{ message: err.message } };
  }
};

// DOM
const form          = document.getElementById('profileForm');
// Use a single Full Name field (name="full_name") for consistency with registration.
// We still map it to the existing API field "name" to avoid breaking other modules.
const nameInput     = form ? form.querySelector('[name="full_name"]') : null;
const emailInput    = form ? form.querySelector('[name="email"]')    : null;
const numberInput   = form ? form.querySelector('[name="number"]')   : null;
const streetInput   = form ? form.querySelector('[name="street"]')   : null;
const barangayInput = form ? form.querySelector('[name="barangay"]') : null;
const cityInput     = form ? form.querySelector('[name="city"]')     : null;
const provinceInput = form ? form.querySelector('[name="province"]') : null;
const passwordInput = form ? form.querySelector('[name="password"]') : null;

const statusBox     = document.getElementById('profileStatus');
const saveBtn       = document.getElementById('profileSaveBtn');
const accountNameEl = document.getElementById('accountName'); // optional, from header chip

// Optional header fields in the profile card
const displayNameEl  = document.getElementById('displayName');
const displayEmailEl = document.getElementById('displayEmail');
const avatarInitialEl = document.getElementById('avatarInitial');

const setStatus = (msg, type = 'info') => {
  if (!statusBox) {
    if (msg) alert(msg);
    return;
  }
  statusBox.textContent = msg || '';
  statusBox.className = 'status ' + type;
  if (!msg) statusBox.classList.add('hidden');
  else statusBox.classList.remove('hidden');
};

// Mirrors splitLegacyAddress() in utilities/personUtils.js so a client saved before
// the address was normalized still populates the four fields for editing.
const splitLegacyAddress = (address) => {
  const parts = String(address || '').split(',').map(p => p.trim()).filter(Boolean);
  const out = { street: '', barangay: '', city: '', province: '' };
  if (!parts.length) return out;
  if (parts.length >= 4) {
    out.street = parts.slice(0, parts.length - 3).join(', ');
    out.barangay = parts[parts.length - 3];
    out.city = parts[parts.length - 2];
    out.province = parts[parts.length - 1];
    return out;
  }
  if (parts.length === 1) { out.city = parts[0]; return out; }
  ['street', 'barangay', 'city', 'province'].slice(4 - parts.length)
    .forEach((k, i) => { out[k] = parts[i]; });
  return out;
};

const readAddressParts = (client) => {
  const hasSplit = ['street', 'barangay', 'city', 'province']
    .some(k => String(client[k] || '').trim());
  if (hasSplit) {
    return {
      street: client.street || '',
      barangay: client.barangay || '',
      city: client.city || '',
      province: client.province || ''
    };
  }
  return splitLegacyAddress(client.address);
};

const fillForm = (client) => {
  if (!form || !client) return;
  const fullName = client.name || client.full_name || '';
  if (nameInput)     nameInput.value     = fullName;
  if (emailInput)    emailInput.value    = client.email   || '';
  if (numberInput)   numberInput.value   = client.number  || '';
  if (passwordInput) passwordInput.value = '';

  const addr = readAddressParts(client);
  if (streetInput)   streetInput.value   = addr.street;
  if (barangayInput) barangayInput.value = addr.barangay;
  if (cityInput)     cityInput.value     = addr.city;
  if (provinceInput) provinceInput.value = addr.province;

  if (accountNameEl) {
    accountNameEl.textContent = fullName || client.email || 'Client';
  }

  if (displayNameEl)  displayNameEl.textContent  = fullName || 'Client';
  if (displayEmailEl) displayEmailEl.textContent = client.email || '';
  if (avatarInitialEl) {
    const initial = (fullName || client.email || 'C').trim().charAt(0).toUpperCase();
    avatarInitialEl.textContent = initial || 'C';
  }
};

// Load current profile
const loadProfile = async () => {
  setStatus('Loading profile…', 'info');

  const res = await fetchJSON(API_GET_PROFILE, { method: 'GET' });
  if (!res.ok || !res.body || res.body.success === false) {
    setStatus(res.body?.message || 'Failed to load profile.', 'error');
    return;
  }

  const client = res.body.client || res.body;
  fillForm(client);
  setStatus('');
};

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Saving changes…', 'info');
    if (saveBtn) saveBtn.disabled = true;

    const payload = {
      // API expects "name"; UI uses "full_name"
      name:    nameInput    ? nameInput.value.trim()    : undefined,
      email:   emailInput   ? emailInput.value.trim()   : undefined,
      number:  numberInput  ? numberInput.value.trim()  : undefined,
      street:   streetInput   ? streetInput.value.trim()   : undefined,
      barangay: barangayInput ? barangayInput.value.trim() : undefined,
      city:     cityInput     ? cityInput.value.trim()     : undefined,
      province: provinceInput ? provinceInput.value.trim() : undefined
    };

    if (passwordInput && passwordInput.value.trim() !== '') {
      payload.password = passwordInput.value.trim();
    }

    const res = await fetchJSON(API_UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (saveBtn) saveBtn.disabled = false;

    if (!res.ok || !res.body || res.body.success === false) {
      setStatus(res.body?.message || 'Failed to update profile.', 'error');
      return;
    }

    const client = res.body.client || null;
    if (client) fillForm(client);

    setStatus('Profile updated successfully.', 'success');
  });
}

// Init
loadProfile();
