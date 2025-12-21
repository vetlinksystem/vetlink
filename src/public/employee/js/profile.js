// Employee Update Profile — API-enabled
// Note: backend currently accepts { name, email, number, password, position }
// We provide a client-like UX for changing password (current/new/confirm) and
// only send the new password field to the backend.

const API_GET_PROFILE = '/employee/profile/me';
const API_UPDATE_PROFILE = '/employee/profile/me';

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
    console.error('profile fetch error', err);
    return { ok:false, status:0, body:{ message: err.message } };
  }
};

// DOM
const form          = document.getElementById('profileForm');
const nameInput     = form ? form.querySelector('[name="name"]')     : null;
const emailInput    = form ? form.querySelector('[name="email"]')    : null;
const numberInput   = form ? form.querySelector('[name="number"]')   : null;
const roleValue     = document.getElementById('roleValue');

// Password fields (client-like)
const curPassInput     = form ? form.querySelector('[name="current_password"]') : null;
const newPassInput     = form ? form.querySelector('[name="password"]') : null;
const confirmPassInput = form ? form.querySelector('[name="confirm_password"]') : null;
const statusBox     = document.getElementById('profileStatus');
const saveBtn       = document.getElementById('profileSaveBtn');

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

const fillForm = (emp) => {
  if (!form || !emp) return;
  if (nameInput)     nameInput.value     = emp.name     || '';
  if (emailInput)    emailInput.value    = emp.email    || '';
  if (numberInput)   numberInput.value   = emp.number   || '';
  if (roleValue) roleValue.textContent = emp.position || emp.role || '—';
  if (curPassInput) curPassInput.value = '';
  if (newPassInput) newPassInput.value = '';
  if (confirmPassInput) confirmPassInput.value = '';
};

// Load current profile
const loadProfile = async () => {
  setStatus('Loading profile…', 'info');

  const res = await fetchJSON(API_GET_PROFILE, { method: 'GET' });
  if (!res.ok || !res.body || res.body.success === false) {
    setStatus(res.body?.message || 'Failed to load profile.', 'error');
    return;
  }

  const emp = res.body.employee || res.body;
  fillForm(emp);
  setStatus('');
};

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Saving changes…', 'info');
    if (saveBtn) saveBtn.disabled = true;

    const payload = {
      name:     nameInput     ? nameInput.value.trim()     : undefined,
      // Email is read-only in UI; keep it for safety/backward compatibility
      email:    emailInput    ? emailInput.value.trim()    : undefined,
      number:   numberInput   ? numberInput.value.trim()   : undefined,
    };

    // Password change validation (client-like)
    const cur = curPassInput ? curPassInput.value.trim() : '';
    const np  = newPassInput ? newPassInput.value.trim() : '';
    const cp  = confirmPassInput ? confirmPassInput.value.trim() : '';

    if (np || cp || cur) {
      if (!cur) {
        if (saveBtn) saveBtn.disabled = false;
        setStatus('Please enter your current password to change it.', 'error');
        return;
      }
      if (!np) {
        if (saveBtn) saveBtn.disabled = false;
        setStatus('Please enter a new password.', 'error');
        return;
      }
      if (np.length < 8) {
        if (saveBtn) saveBtn.disabled = false;
        setStatus('New password must be at least 8 characters.', 'error');
        return;
      }
      if (np !== cp) {
        if (saveBtn) saveBtn.disabled = false;
        setStatus('New password and confirmation do not match.', 'error');
        return;
      }

      // Backend currently accepts only `password`.
      payload.password = np;
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

    const emp = res.body.employee || null;
    if (emp) fillForm(emp);

    setStatus('Profile updated successfully.', 'success');
  });
}

// Init
loadProfile();
