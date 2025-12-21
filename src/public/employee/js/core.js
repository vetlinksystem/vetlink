(() => {
  // Employee pages are protected server-side using the cookie session.
  // The old implementation depended on localStorage (vetlink_auth), which
  // is NOT set by the current /login flow. That caused redirect loops and
  // made the UI feel "unclickable" because the page kept navigating.
  //
  // Here we simply fetch the currently logged-in employee and use that to
  // populate the account name. If the session is missing/expired, we fall
  // back to the public login page.

  // Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const accountBtn = document.getElementById('accountBtn');
  const accountMenu = document.getElementById('accountMenu');
  const menuLogout = document.getElementById('menuLogout');
  const logoutBtn = document.getElementById('logoutBtn');
  const accountName = document.getElementById('accountName');
  const crumb = document.getElementById('crumb');

  const fetchJSON = async (url, options = {}, timeoutMs = 15000) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
        signal: ctl.signal,
        ...options
      });
      clearTimeout(t);
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body };
    } catch (err) {
      clearTimeout(t);
      return { ok: false, status: 0, body: { message: 'Network error' } };
    }
  };

  // Populate logged-in name (non-blocking)
  (async () => {
    const { ok, status, body } = await fetchJSON('/employee/profile/me');
    if (!ok) {
      // If unauthorized, go back to login.
      if (status === 401 || status === 403) window.location.href = '/';
      return;
    }

    const emp = body?.employee || body?.user || body || {};
    const fullName = emp.full_name || emp.name || emp.email;
    if (accountName) accountName.textContent = fullName || 'User';

    // Hide Manage Employees when not admin
    const isAdmin = !!emp.isAdmin;
    const manageEmployeesLink = document.querySelector('.nav a.nav-item[href="/employee/employees"]');
    if (manageEmployeesLink && !isAdmin) {
      manageEmployeesLink.style.display = 'none';
    }
  })();

  // Sidebar hide/unhide
  sidebarToggle?.addEventListener('click', () => sidebar.classList.toggle('show'));

  // Account dropdown
  accountBtn?.addEventListener('click', () => {
    accountMenu.classList.toggle('show');
    accountBtn.setAttribute('aria-expanded', accountMenu.classList.contains('show') ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (!accountBtn?.contains(e.target) && !accountMenu?.contains(e.target)) {
      accountMenu?.classList.remove('show');
      accountBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  // Logout
  const doLogout = async () => {
    try { await fetch('/logout', { method: 'POST', credentials: 'include' }); } catch(_) {}
    window.location.href = '/';
  };
  logoutBtn?.addEventListener('click', doLogout);
  menuLogout?.addEventListener('click', (e) => { e.preventDefault(); doLogout(); });

  // Highlight active nav
  const here = location.pathname.replace(/\/+$/, '') || '/employee/dashboard';
  document.querySelectorAll('.nav a.nav-item').forEach(a => {
    const target = a.getAttribute('href');
    if (target === here || (target === '/employee/dashboard' && here === '/')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });

  // Breadcrumb from document title (after "— ")
  const t = document.title.split('—').pop().trim();
  if (crumb) crumb.textContent = t;
})();
