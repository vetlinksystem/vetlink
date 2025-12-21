// Dashboard-only logic: KPIs + recent tables
(() => {
  const api = {
    kpis: {
      users: '/employee/total-user-registered',
      pets: '/employee/total-pet-registered',
      breeds: '/employee/total-breeds',
      successReservations: '/employee/total-success-appointments',
      pendingReservations: '/employee/total-pending-appointments'
    },
    recent: {
      users: '/employee/recent-users?limit=5',
      pets: '/employee/recent-pets?limit=5'
    }
  };

  const jsonGET = async (url, timeoutMs = 15000) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { credentials: 'include', headers: { 'Accept':'application/json' }, signal: ctl.signal });
      clearTimeout(t);
      const ct = res.headers.get('content-type') || '';
      const body = ct.includes('application/json') ? await res.json() : await res.text();
      return { ok: res.ok, status: res.status, body };
    } catch (err) { clearTimeout(t); throw err; }
  };

  const mountTable = (mountEl, rows, columns) => {
    const el = typeof mountEl === 'string' ? document.getElementById(mountEl) : mountEl;
    if (!el) return;
    if (!rows || !rows.length) { el.innerHTML = '<div class="empty">No data</div>'; return; }
    const thead = '<thead><tr>' + columns.map(c => `<th>${c.label}</th>`).join('') + '</tr></thead>';
    const tbody = '<tbody>' + rows.map(r => '<tr>' + columns.map(c => `<td>${(r[c.key] ?? '')}</td>`).join('') + '</tr>').join('') + '</tbody>';
    el.innerHTML = `<table>${thead}${tbody}</table>`;
  };

  // Fill KPIs
  const el = {
    users: document.getElementById('kpi-users'),
    pets: document.getElementById('kpi-pets'),
    breeds: document.getElementById('kpi-breeds'),
    success: document.getElementById('kpi-success'),
    pending: document.getElementById('kpi-pending'),
  };
  if (!el.users) return; // not on dashboard.html

  el.users.textContent = el.pets.textContent = el.breeds.textContent = el.success.textContent = el.pending.textContent = '…';

  Promise.all([
    jsonGET(api.kpis.users),
    jsonGET(api.kpis.pets),
    jsonGET(api.kpis.breeds),
    jsonGET(api.kpis.successReservations),
    jsonGET(api.kpis.pendingReservations)
  ]).then(([u,p,b,s,pn]) => {
    el.users.textContent   = u.ok  ? (u.body.total ?? u.body)  : '—';
    el.pets.textContent    = p.ok  ? (p.body.total ?? p.body)  : '—';
    el.breeds.textContent  = b.ok  ? (b.body.total ?? b.body)  : '—';
    el.success.textContent = s.ok  ? (s.body.total ?? s.body)  : '—';
    el.pending.textContent = pn.ok ? (pn.body.total ?? pn.body): '—';
  }).catch(()=>{});

  // Tables (using your field list)
  jsonGET(api.recent.users).then(r => {
    if (r.ok) {
      mountTable('table-users', r.body.items || r.body, [
        { key: 'id',      label: 'ID' },
        { key: 'name',    label: 'Name' },
        { key: 'email',   label: 'Email' },
        { key: 'number',  label: 'Contact No.' },
        { key: 'address', label: 'Address' },
      ]);
    }
  });

  jsonGET(api.recent.pets).then(r => {
    if (r.ok) {
      mountTable('table-pets', r.body.items || r.body, [
        { key: 'id',          label: 'Pet ID' },
        { key: 'name',        label: 'Name' },
        { key: 'breed',       label: 'Breed' },
        { key: 'species',     label: 'Species' },
        { key: 'sex',         label: 'Sex' },
        { key: 'dateOfBirth', label: 'Date of Birth' },
        { key: 'age',         label: 'Age' },
        { key: 'weight',      label: 'Weight' },
        { key: 'ownerId',     label: 'Owner ID' },
      ]);
    }
  });
})();
