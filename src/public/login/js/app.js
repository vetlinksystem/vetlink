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

  // Inputs (register)
  const regName = $('regName');
  const regEmail = $('regEmail');
  const regNumber = $('regNumber');
  const regAddress = $('regAddress');
  const regPassword = $('regPassword');
  const regConfirm = $('regConfirm');
  const pwRules = $('pwRules');
  const registerSubmit = $('registerSubmit');
  const loginSubmit = $('loginSubmit');

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
    registerSubmit.disabled = !(pwOk && confirmOk && (regName?.value||'').trim() && (regEmail?.value||'').trim());
  };

  const setStatus = (msg = '', kind = '') => {
    if (!authStatus) return;
    authStatus.textContent = msg;
    authStatus.classList.remove('error', 'ok');
    if (kind) authStatus.classList.add(kind);
  };

  const showLogin = () => {
    if (loginView) loginView.style.display = '';
    if (registerView) registerView.style.display = 'none';
    if (formTitle) formTitle.textContent = 'Login';
    setStatus('');
  };

  const showRegister = () => {
    if (registerView) registerView.style.display = '';
    if (loginView) loginView.style.display = 'none';
    if (formTitle) formTitle.textContent = 'Create Account';
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

    const name = (regName?.value || '').trim();
    const email = (regEmail?.value || '').trim();
    const number = (regNumber?.value || '').trim();
    const address = (regAddress?.value || '').trim();
    const password = (regPassword?.value || '').trim();
    const confirm = (regConfirm?.value || '').trim();

    if (!name || !email || !password) {
      setStatus('Name, email, and password are required.', 'error');
      return;
    }
    if (!checkPasswordRules(password)) {
      setStatus('Password does not meet the required rules.', 'error');
      return;
    }
    if (password !== confirm) {
      setStatus('Passwords do not match.', 'error');
      return;
    }

    try {
      const { ok, body } = await fetchJSON('/register/client', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, number, address })
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

  // Live rule validation
  regPassword?.addEventListener('input', syncRegisterBtn);
  regConfirm?.addEventListener('input', syncRegisterBtn);
  regName?.addEventListener('input', syncRegisterBtn);
  regEmail?.addEventListener('input', syncRegisterBtn);
  syncRegisterBtn();
})();
