// src/public/login/js/app.js

(function () {
  const $ = (id) => document.getElementById(id);

  // Views
  const loginView = $('loginView');
  const registerView = $('registerView');

  // Title + status
  const formTitle = $('formTitle');
  const authStatus = $('authStatus');

  // Switch links
  const toRegister = $('toRegister');
  const toLogin = $('toLogin');

  // Role buttons
  const loginAsClientBtn = $('loginAsClientBtn');
  const loginAsEmployeeBtn = $('loginAsEmployeeBtn');
  const loginUserType = $('loginUserType');

  // Forms
  const loginForm = $('loginForm');
  const registerForm = $('registerForm');

  // Inputs (login)
  const loginUsername = $('loginUsername');
  const loginPassword = $('loginPassword');

  // Inputs (register) — 1NF name fields
  const regLastName = $('regLastName');
  const regFirstName = $('regFirstName');
  const regMiddleName = $('regMiddleName');
  const regDateOfBirth = $('regDateOfBirth');
  const regSex = $('regSex');
  const regEmail = $('regEmail');
  const regNumber = $('regNumber');
  const regStreet = $('regStreet');
  const regBarangay = $('regBarangay');
  const regCity = $('regCity');
  const regProvince = $('regProvince');
  const regPassword = $('regPassword');
  const regConfirm = $('regConfirm');
  const pwRules = $('pwRules');
  const registerSubmit = $('registerSubmit');
  const loginSubmit = $('loginSubmit');

  // Consent checkboxes (Data Privacy Act of 2012 — RA 10173)
  const regConsentPrivacy = $('regConsentPrivacy');
  const regConsentDpa = $('regConsentDpa');
  const regConsentTruthful = $('regConsentTruthful');

  // PH mobile: 09XXXXXXXXX / +639XXXXXXXXX / 639XXXXXXXXX
  const isValidMobile = (value) => {
    const d = String(value || '').replace(/[^\d+]/g, '');
    return /^09\d{9}$/.test(d) || /^\+639\d{9}$/.test(d) || /^639\d{9}$/.test(d);
  };

  // Password toggle (login/register)
  document.querySelectorAll('.pw-toggle[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-toggle');
      const input = document.getElementById(id);
      if (!input) return;
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.textContent = isPass ? '🙈' : '👁️';
    });
  });

  // Password rules (client register)
  const ruleState = {
    len: false,
    upper: false,
    lower: false,
    num: false,
    special: false,
  };

  const checkPasswordRules = (pw) => {
    const s = String(pw || '');
    ruleState.len = s.length >= 11;
    ruleState.upper = /[A-Z]/.test(s);
    ruleState.lower = /[a-z]/.test(s);
    ruleState.num = /[0-9]/.test(s);
    ruleState.special = /[^A-Za-z0-9]/.test(s);
    return Object.values(ruleState).every(Boolean);
  };

  const renderRules = () => {
    if (!pwRules) return;
    pwRules.querySelectorAll('.rule').forEach(el => {
      const key = el.getAttribute('data-rule');
      const ok = !!ruleState[key];
      el.classList.remove('ok','bad');
      el.classList.add(ok ? 'ok' : 'bad');
      const dot = el.querySelector('.dot');
      if (dot) dot.textContent = ok ? '✓' : '✗';
    });
  };

  const syncRegisterBtn = () => {
    if (!registerSubmit) return;
    const pwOk = checkPasswordRules(regPassword?.value || '');
    renderRules();
    const confirmOk = (regPassword?.value || '') === (regConfirm?.value || '');

    // Required personal info: first + last name, DOB, sex, email, contact no., address
    const identityOk =
      !!(regFirstName?.value || '').trim() &&
      !!(regLastName?.value || '').trim() &&
      !!(regDateOfBirth?.value || '').trim() &&
      !!(regSex?.value || '').trim() &&
      !!(regEmail?.value || '').trim();

    // Contact no. and every address component are no longer optional
    const contactOk =
      isValidMobile(regNumber?.value || '') &&
      [regStreet, regBarangay, regCity, regProvince]
        .every(el => !!(el?.value || '').trim());

    // All three consents are mandatory under RA 10173
    const consentOk =
      !!regConsentPrivacy?.checked &&
      !!regConsentDpa?.checked &&
      !!regConsentTruthful?.checked;

    registerSubmit.disabled = !(pwOk && confirmOk && identityOk && contactOk && consentOk);
  };

  const setStatus = (msg = '', kind = '') => {
    if (!authStatus) return;
    authStatus.textContent = msg;
    authStatus.classList.remove('error', 'ok');
    if (kind) authStatus.classList.add(kind);
  };

  // The registration form needs a wider card than the login form.
  const card = document.querySelector('.auth .card');

  const showLogin = () => {
    if (loginView) loginView.style.display = '';
    if (registerView) registerView.style.display = 'none';
    if (formTitle) formTitle.textContent = 'Login';
    card?.classList.remove('wide');
    setStatus('');
  };

  const showRegister = () => {
    if (registerView) registerView.style.display = '';
    if (loginView) loginView.style.display = 'none';
    if (formTitle) formTitle.textContent = 'Create Account';
    card?.classList.add('wide');
    setStatus('');
  };

  const setRole = (role) => {
    if (loginUserType) loginUserType.value = role;

    loginAsClientBtn?.classList.toggle('active', role === 'client');
    loginAsEmployeeBtn?.classList.toggle('active', role === 'employee');
  };

  // --- Events: switch views ---
  toRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    showRegister();
  });

  toLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
  });

  // --- Events: role buttons ---
  loginAsClientBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    setRole('client');
  });

  loginAsEmployeeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    setRole('employee');
  });

  // --- Helper: fetch JSON ---
  const fetchJSON = async (url, options = {}) => {
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      ...options
    });

    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
  };

  // --- LOGIN submit: POST /login ---
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Signing in…');

    const username = (loginUsername?.value || '').trim();
    const password = (loginPassword?.value || '').trim();
    const user_type = loginUserType?.value || 'client';

    if (!username || !password) {
      setStatus('Please enter your email/username and password.', 'error');
      return;
    }

    try {
      const { ok, body } = await fetchJSON('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, user_type })
      });

      if (!ok || body?.success === false) {
        setStatus(body?.message || 'Login failed.', 'error');
        return;
      }

      setStatus('Login successful.', 'ok');
      window.location.href = body.redirect || '/';
    } catch (err) {
      console.error(err);
      setStatus('Network error during login.', 'error');
    }
  });

  // --- REGISTER submit: POST /register/client ---
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Creating account…');

    const payload = {
      lastName: (regLastName?.value || '').trim(),
      firstName: (regFirstName?.value || '').trim(),
      middleName: (regMiddleName?.value || '').trim(),
      dateOfBirth: (regDateOfBirth?.value || '').trim(),
      sex: (regSex?.value || '').trim(),
      email: (regEmail?.value || '').trim(),
      number: (regNumber?.value || '').trim(),
      street: (regStreet?.value || '').trim(),
      barangay: (regBarangay?.value || '').trim(),
      city: (regCity?.value || '').trim(),
      province: (regProvince?.value || '').trim(),
      password: (regPassword?.value || '').trim(),
      consentPrivacy: !!regConsentPrivacy?.checked,
      consentDpa: !!regConsentDpa?.checked,
      consentTruthful: !!regConsentTruthful?.checked
    };
    const confirm = (regConfirm?.value || '').trim();

    if (!payload.firstName || !payload.lastName) {
      setStatus('First name and last name are required.', 'error');
      return;
    }
    if (!payload.dateOfBirth || !payload.sex) {
      setStatus('Date of birth and sex are required.', 'error');
      return;
    }
    if (!payload.email || !payload.password) {
      setStatus('Email and password are required.', 'error');
      return;
    }
    if (!isValidMobile(payload.number)) {
      setStatus('Please enter a valid contact number (e.g. 09171234567).', 'error');
      return;
    }
    if (!payload.address) {
      setStatus('Complete address is required.', 'error');
      return;
    }
    if (!checkPasswordRules(payload.password)) {
      setStatus('Password does not meet the required rules.', 'error');
      return;
    }
    if (payload.password !== confirm) {
      setStatus('Passwords do not match.', 'error');
      return;
    }
    if (!payload.consentPrivacy || !payload.consentDpa || !payload.consentTruthful) {
      setStatus('Please accept the Privacy Policy and the Data Privacy Act consent to continue.', 'error');
      return;
    }

    try {
      const { ok, body } = await fetchJSON('/register/client', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!ok || body?.success === false) {
        setStatus(body?.message || 'Registration failed.', 'error');
        return;
      }

      setStatus('Account created.', 'ok');
      window.location.href = body.redirect || '/client/dashboard';
    } catch (err) {
      console.error(err);
      setStatus('Network error during registration.', 'error');
    }
  });

  // Init
  showLogin();
  setRole('client');

  // Date of birth cannot be in the future
  if (regDateOfBirth) {
    regDateOfBirth.max = new Date().toISOString().slice(0, 10);
  }

  // Live rule validation
  [
    regPassword, regConfirm,
    regLastName, regFirstName, regMiddleName,
    regDateOfBirth, regSex, regEmail, regNumber,
    regStreet, regBarangay, regCity, regProvince
  ].forEach(el => {
    el?.addEventListener('input', syncRegisterBtn);
    el?.addEventListener('change', syncRegisterBtn);
  });
  [regConsentPrivacy, regConsentDpa, regConsentTruthful].forEach(el => {
    el?.addEventListener('change', syncRegisterBtn);
  });
  syncRegisterBtn();
})();
