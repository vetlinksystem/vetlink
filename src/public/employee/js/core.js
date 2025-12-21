(() => {
  // Guard: must be logged in
  const authRaw = localStorage.getItem('vetlink_auth') || sessionStorage.getItem('vetlink_auth');
  const auth = authRaw ? JSON.parse(authRaw) : null;
  if (!auth || !auth.token) { window.location.href = '/'; return; }

  // Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const accountBtn = document.getElementById('accountBtn');
  const accountMenu = document.getElementById('accountMenu');
  const menuLogout = document.getElementById('menuLogout');
  const logoutBtn = document.getElementById('logoutBtn');
  const accountName = document.getElementById('accountName');
  const crumb = document.getElementById('crumb');

  if (accountName) accountName.textContent = auth.name || 'User';

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
    localStorage.removeItem('vetlink_auth');
    sessionStorage.removeItem('vetlink_auth');
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
