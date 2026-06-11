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
    // Expose current employee for role-based UI (e.g., breeding permissions)
    window.VETLINK_EMPLOYEE = emp;
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

  /* NOTIFICATION BELL (employee inbox)
     Uses GET /notifications/my + PUT /notifications/mark-read.
     Breeding review notifications link to /employee/breeding. */
  (function employeeNotifications(){
    const topbar = document.querySelector('header.topbar');
    const account = document.querySelector('.account');
    if (!topbar || !account || document.getElementById('empNotifBtn')) return;

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;margin-right:.5rem';
    wrap.innerHTML = `
      <button id="empNotifBtn" type="button" title="Notifications"
        style="position:relative;background:transparent;border:none;cursor:pointer;font-size:1.15rem;padding:.35rem .5rem">
        🔔
        <span id="empNotifCount" style="display:none;position:absolute;top:-2px;right:-2px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#e11d48;color:#fff;font-size:11px;line-height:17px;text-align:center;font-weight:700">0</span>
      </button>
      <div id="empNotifMenu" style="display:none;position:absolute;right:0;top:40px;z-index:80;min-width:300px;max-width:340px;max-height:380px;overflow-y:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 30px rgba(16,24,40,.18);padding:.4rem"></div>
    `;
    account.parentNode.insertBefore(wrap, account);

    const btn = document.getElementById('empNotifBtn');
    const menu = document.getElementById('empNotifMenu');
    const countEl = document.getElementById('empNotifCount');

    const render = (items) => {
      const unread = items.filter(n => !n.read).length;
      countEl.style.display = unread ? 'inline-block' : 'none';
      countEl.textContent = String(unread);

      if (!items.length) {
        menu.innerHTML = '<div style="padding:.7rem;color:#6b7280">No notifications</div>';
        return;
      }
      menu.innerHTML = items.slice(0, 15).map(n => `
        <div data-nid="${esc(n.id)}" data-type="${esc(n.type || '')}"
             style="padding:.55rem .6rem;border-radius:10px;margin:.3rem 0;cursor:pointer;border:1px solid #f1f5f9;background:${n.read ? 'transparent' : '#fef9c3'}">
          <div style="display:flex;justify-content:space-between;gap:.5rem">
            <strong style="font-size:.88rem">${esc(n.title || 'Notification')}</strong>
            <small style="color:#6b7280">${esc((n.createdAt || '').toString().slice(0, 10))}</small>
          </div>
          <div style="margin-top:.25rem;color:#374151;font-size:.85rem">${esc(n.message || '')}</div>
        </div>
      `).join('');

      menu.querySelectorAll('[data-nid]').forEach(card => {
        card.addEventListener('click', async () => {
          const id = card.getAttribute('data-nid');
          await fetchJSON('/notifications/mark-read', {
            method:'PUT',
            headers:{ 'Accept':'application/json','Content-Type':'application/json' },
            body: JSON.stringify({ id })
          });
          if ((card.getAttribute('data-type') || '').startsWith('breeding')) {
            window.location.href = '/employee/breeding';
            return;
          }
          refresh();
        });
      });
    };

    const refresh = async () => {
      const { ok, body } = await fetchJSON('/notifications/my');
      if (!ok) return;
      const items = Array.isArray(body?.notifications) ? body.notifications : [];
      render(items);
    };

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const show = menu.style.display !== 'block';
      menu.style.display = show ? 'block' : 'none';
      if (show) refresh();
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) menu.style.display = 'none';
    });

    refresh();
    setInterval(refresh, 30000);
  })();
})();
