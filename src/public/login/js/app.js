// src/public/login/js/app.js

(function () {
  const $ = (id) => document.getElementById(id);

  // Views
  const loginView = $('loginView');
  const registerView = $('registerView');

  // Title + status
  const formTitle = $('formTitle');
  const formSub = $('formSub');
  const authStatus = $('authStatus');

  // Switch links
  const toRegister = $('toRegister');
  const toLogin = $('toLogin');
  const forgotLink = $('forgotLink');

  // The page decides the role (/client/login vs /employee/login)
  const role = document.body.dataset.role === 'employee' ? 'employee' : 'client';
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
      btn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
      btn.querySelector('use')?.setAttribute('href', isPass ? '#i-eye-off' : '#i-eye');
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

  const LOGIN_COPY = role === 'employee'
    ? { title: 'Employee Login', sub: 'Authorized staff access' }
    : { title: 'Client Login', sub: 'Access your pet’s care portal' };

  const showLogin = () => {
    if (loginView) loginView.hidden = false;
    if (registerView) registerView.hidden = true;
    if (formTitle) formTitle.textContent = LOGIN_COPY.title;
    if (formSub) formSub.textContent = LOGIN_COPY.sub;
    setStatus('');
  };

  // Self-registration is for clients only — staff accounts are created by an admin.
  const showRegister = () => {
    if (!registerView) return showLogin();
    registerView.hidden = false;
    if (loginView) loginView.hidden = true;
    if (formTitle) formTitle.textContent = 'Create Account';
    if (formSub) formSub.textContent = 'Register as a new client';
    setStatus('');
  };

  // #register deep-links straight to the form (e.g. "Create an Account" on the portal)
  const syncViewWithHash = () => {
    if (location.hash === '#register') showRegister();
    else showLogin();
  };

  // --- Events: switch views ---
  toRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(null, '', '#register');
    showRegister();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  toLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(null, '', location.pathname);
    showLogin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('hashchange', syncViewWithHash);

  // No self-service reset yet — point the user to the clinic.
  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    setStatus('Please contact Doc Ben’z clinic staff to reset your password.');
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
    const user_type = loginUserType?.value || role;

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
    // Address is stored in 1NF (street / barangay / city / province) — check the parts,
    // not the derived flat `address`, which the payload never carries.
    const ADDRESS_LABELS = {
      street: 'house/street',
      barangay: 'barangay',
      city: 'city/municipality',
      province: 'province'
    };
    const missingAddress = Object.keys(ADDRESS_LABELS).filter(k => !payload[k]);
    if (missingAddress.length) {
      setStatus(
        `Please complete your address — missing: ${missingAddress.map(k => ADDRESS_LABELS[k]).join(', ')}.`,
        'error'
      );
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
  syncViewWithHash();

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
