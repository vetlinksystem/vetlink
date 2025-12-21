/* ===========================================================
   CLIENT DASHBOARD — REAL API WIRED
   -----------------------------------------------------------
   Backend endpoint:
     GET /client/dashboard/overview
     → {
         success: true,
         appointments: [
           { id, pet, service, date:'YYYY-MM-DD', time:'HH:mm', status }
         ],
         pets: [
           { id, name, species, breed }
         ],
         records: [
           { id, pet, type, date:'YYYY-MM-DD', url }
         ],
         petsTotal: <number>
       }
   =========================================================== */

(function () {
  const API_OVERVIEW = '/client/dashboard/overview';

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
      console.error('client dashboard fetch error', err);
      return { ok: false, status: 0, body: { message: err.message } };
    }
  };

  const statsEl = document.getElementById('stats');
  if (!statsEl) return;

  // Topbar actions are handled globally in client/core.js

  (async function loadDashboard() {
    // Simple loading card
    statsEl.innerHTML = `
      <div class="card stat">
        <div class="chip">Loading</div>
        <h3>Loading dashboard…</h3>
        <div class="value">…</div>
        <small>Please wait.</small>
      </div>
    `;

    const { ok, body } = await fetchJSON(API_OVERVIEW, { method: 'GET' });

    if (!ok || !body || body.success === false) {
      console.warn('Failed to load client dashboard overview', body);
      statsEl.innerHTML = `
        <div class="card stat">
          <div class="chip danger">Error</div>
          <h3>Unable to load data</h3>
          <div class="value">!</div>
          <small>${esc(body?.message || 'Please try refreshing the page.')}</small>
        </div>
      `;
      return;
    }

    const appointments = Array.isArray(body.appointments) ? body.appointments : [];
    const pets         = Array.isArray(body.pets) ? body.pets : [];
    const records      = Array.isArray(body.records) ? body.records : [];
    const petsTotal    = typeof body.petsTotal === 'number' ? body.petsTotal : pets.length;

    const today = new Date().toISOString().slice(0, 10);

    // 1) Next upcoming appointment
    const upcoming = appointments
      .filter(a => a.date && a.date >= today && a.status !== 'Completed' && a.status !== 'Cancelled')
      .sort((a, b) => (String(a.date) + String(a.time || '')).localeCompare(String(b.date) + String(b.time || '')))[0];

    // 2) Pending appointments only
    const pendingCount = appointments.filter(a => a.status === 'Pending').length;

    // 3) Pets count
    const petsCount = petsTotal;

    // 4) Records count
    const recordsCount = records.length;

    statsEl.innerHTML = `
      <div class="card stat">
        <div class="chip">Upcoming</div>
        <h3>Next appointment</h3>
        <div class="value">
          ${upcoming ? `${esc(upcoming.pet)} • ${esc(upcoming.service)}` : '—'}
        </div>
        <small>
          ${upcoming
            ? `${upcoming.date}${upcoming.time ? ' at ' + upcoming.time : ''}`
            : 'No upcoming visits. Book one below.'}
        </small>
      </div>

      <div class="card stat">
        <div class="chip">Requests</div>
        <h3>Pending appointments</h3>
        <div class="value">${pendingCount}</div>
        <small>Waiting for clinic confirmation.</small>
      </div>

      <div class="card stat">
        <div class="chip">Pets</div>
        <h3>Registered pets</h3>
        <div class="value">${petsCount}</div>
        <small>Manage them in <a href="/client/pets">My Pets</a>.</small>
      </div>

      <div class="card stat">
        <div class="chip">Records</div>
        <h3>Medical records</h3>
        <div class="value">${recordsCount}</div>
        <small>View or download from <a href="/client/records">Records</a>.</small>
      </div>
    `;
  })();

  function esc(s) {
    return (s ?? '').toString().replace(/[&<>\"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
})();
