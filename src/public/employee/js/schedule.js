// Employee Schedule — shows appointments on a monthly calendar.
// Pulls real data from backend:
//   GET /clients/get-all
//   GET /pets/get-all
//   GET /appointments?limit=500&offset=0

(() => {
  // ===== API endpoints =====
  const API_CLIENTS = '/clients/get-all';
  const API_PETS    = '/pets/get-all';
  const API_APPTS   = '/appointments?limit=500&offset=0';

  // ===== Fetch helper =====
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
    } catch (e) {
      clearTimeout(t);
      console.error('schedule fetch error', e);
      return { ok: false, status: 0, body: { message: e.message || 'Network error' } };
    }
  };

  // ===== Helpers =====
  const pad2 = (n) => String(n).padStart(2, '0');
  const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const parseISODate = (s) => {
    const [y, m, d] = String(s || '').split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const normalizeDateTime = (dateTime) => {
    if (!dateTime) return { date: null, time: null };

    // Firestore Timestamp
    if (typeof dateTime === 'object' && typeof dateTime.toDate === 'function') {
      const d = dateTime.toDate();
      return {
        date: toISODate(d),
        time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
      };
    }

    if (typeof dateTime === 'string') {
      let datePart = null;
      let timePart = null;
      if (dateTime.includes('T')) [datePart, timePart] = dateTime.split('T');
      else if (dateTime.includes(' ')) [datePart, timePart] = dateTime.split(' ');
      else datePart = dateTime;

      if (timePart) {
        if (timePart.includes('+')) timePart = timePart.split('+')[0];
        if (timePart.endsWith('Z')) timePart = timePart.slice(0, -1);
        const [h, m] = timePart.split(':');
        timePart = `${pad2(Number(h) || 0)}:${pad2(Number(m) || 0)}`;
      }
      return { date: datePart || null, time: timePart || null };
    }

    return { date: null, time: null };
  };

  const byId = (arr, id) => arr.find(x => String(x.id) === String(id));

  const statusToMarker = (statusRaw) => {
    const s = String(statusRaw || '').toLowerCase();
    if (s === 'pending') return 'marker warn';
    if (s === 'cancelled' || s === 'canceled') return 'marker danger';
    return 'marker';
  };

  const sameDate = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const monthLabel = (d) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const rangeLabel = (start, end) =>
    `${start.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} – ` +
    `${end.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`;

  const groupByDate = (items) => {
    const map = {};
    for (const e of items) (map[e.date] ||= []).push(e);
    return map;
  };

  // ===== State =====
  const state = {
    cursor: new Date(),
    clients: [],
    pets: [],
    data: [] // { id, date, start, end?, purpose, ownerId, ownerName, petId, petName, status, notes }
  };

  // ===== DOM =====
  const elMonth = document.getElementById('calMonth');
  const elRange = document.getElementById('calRange');
  const grid = document.getElementById('calGrid');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const todayBtn = document.getElementById('todayBtn');
  const pop = document.getElementById('popover');
  const popTitle = document.getElementById('popoverTitle');
  const popBody = document.getElementById('popoverBody');
  const popClose = pop?.querySelector('.popover-close');

  // ===== Popover =====
  const closePopover = () => {
    if (!pop) return;
    pop.classList.remove('show');
    pop.setAttribute('aria-hidden', 'true');
  };
  popClose?.addEventListener('click', closePopover);
  document.addEventListener('click', (e) => {
    if (e.target === pop) closePopover();
  });

  const openPopover = (anchorRect, title, events) => {
    if (!pop || !popTitle || !popBody) return;

    popTitle.textContent = title;
    popBody.innerHTML = events.map(ev => `
      <div class="event">
        <div class="when">${ev.start}${ev.end ? ' – ' + ev.end : ''}</div>
        <div class="purpose">${ev.purpose || 'Appointment'}</div>
        <div class="meta">
          Owner: <a class="link" href="/employee/user?id=${encodeURIComponent(ev.ownerId)}">${ev.ownerName || ('#' + ev.ownerId)}</a>
          • Pet: <a class="link" href="/employee/pet?id=${encodeURIComponent(ev.petId)}">${ev.petName || ('#' + ev.petId)}</a>
        </div>
        ${ev.notes ? `<div class="meta">Notes: ${String(ev.notes)}</div>` : ''}
      </div>
    `).join('');

    pop.classList.add('show');
    pop.setAttribute('aria-hidden', 'false');

    const card = pop.querySelector('.popover-card');
    if (!card) return;

    const vpW = window.innerWidth, vpH = window.innerHeight;
    const cardW = Math.min(420, Math.max(320, Math.floor(vpW * 0.4)));
    card.style.width = cardW + 'px';

    let left = anchorRect.right + 12;
    let top = anchorRect.top;
    if (left + cardW + 12 > vpW) left = anchorRect.left - cardW - 12;
    if (left < 8) left = 8;

    const cardH = Math.min(vpH * 0.6, 520);
    card.style.maxHeight = cardH + 'px';
    if (top + cardH + 12 > vpH) top = vpH - cardH - 12;
    if (top < 8) top = 8;

    card.style.left = left + 'px';
    card.style.top = top + 'px';
  };

  // ===== Render calendar month grid =====
  const render = () => {
    const d = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
    const year = d.getFullYear();
    const month = d.getMonth();

    if (elMonth) elMonth.textContent = monthLabel(d);

    const firstDow = d.getDay();
    const start = new Date(year, month, 1 - firstDow);
    const end = new Date(start);
    end.setDate(start.getDate() + 41);

    if (elRange) elRange.textContent = rangeLabel(start, end);

    const grouped = groupByDate(state.data);

    // remove old cells (keep DOW header cells)
    [...grid.querySelectorAll('.cal-day, .empty-day')].forEach(n => n.remove());

    const today = new Date();
    for (let i = 0; i < 42; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const inMonth = cur.getMonth() === month;
      const dateISO = toISODate(cur);
      const dayEvents = grouped[dateISO] || [];

      const cell = document.createElement('div');
      cell.className = 'cal-day' + (inMonth ? '' : ' other');
      if (sameDate(cur, today)) cell.classList.add('today');

      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = cur.getDate();
      cell.appendChild(num);

      if (dayEvents.length) {
        const markers = document.createElement('div');
        markers.className = 'markers';
        dayEvents.slice(0, 4).forEach(e => {
          const dot = document.createElement('span');
          dot.className = statusToMarker(e.status);
          markers.appendChild(dot);
        });
        if (dayEvents.length > 4) {
          const more = document.createElement('span');
          more.className = 'count-pill';
          more.textContent = `+${dayEvents.length - 4}`;
          markers.appendChild(more);
        }
        cell.appendChild(markers);

        cell.addEventListener('click', () => {
          openPopover(
            cell.getBoundingClientRect(),
            cur.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            dayEvents.sort((a, b) => (a.start || '').localeCompare(b.start || ''))
          );
        });
      }

      grid.appendChild(cell);
    }
  };

  // ===== Load and map appointments into schedule data =====
  const mapAppointmentsToEvents = (appointments) => {
    const events = [];
    for (const raw of appointments || []) {
      const dt = normalizeDateTime(raw.dateTime || raw.date || null);
      if (!dt.date) continue;

      const clientId = raw.clientId || raw.ownerId;
      const petId = raw.petId;
      const client = byId(state.clients, clientId);
      const pet = byId(state.pets, petId);

      const ownerName = client?.name || client?.full_name || client?.email || '';
      const petName = pet?.name || '';

      events.push({
        id: raw.id,
        date: dt.date,
        start: dt.time || '00:00',
        end: '',
        purpose: raw.purpose || raw.service || 'Appointment',
        ownerId: String(clientId || ''),
        ownerName,
        petId: String(petId || ''),
        petName,
        status: raw.status || 'Pending',
        notes: raw.notes || ''
      });
    }
    return events;
  };

  const loadMonth = async () => {
    // We still load ALL appointments (small dataset). Then filter to the visible range.
    const y = state.cursor.getFullYear();
    const m = state.cursor.getMonth();
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0);
    const from = new Date(monthStart); from.setDate(from.getDate() - 7);
    const to = new Date(monthEnd);     to.setDate(to.getDate() + 7);

    // Fetch supporting data first time (clients/pets)
    if (!state.clients.length) {
      const r = await fetchJSON(API_CLIENTS);
      state.clients = Array.isArray(r.body) ? r.body : (r.body?.clients || []);
    }
    if (!state.pets.length) {
      const r = await fetchJSON(API_PETS);
      state.pets = Array.isArray(r.body) ? r.body : (r.body?.pets || []);
    }

    const ap = await fetchJSON(API_APPTS);
    const all = Array.isArray(ap.body) ? ap.body : (ap.body?.appointments || ap.body?.items || []);
    const events = mapAppointmentsToEvents(all);

    // Filter events within range
    state.data = events.filter(e => {
      const d = parseISODate(e.date);
      return d && d >= from && d <= to;
    });

    render();
  };

  // Nav
  prevBtn?.addEventListener('click', () => { state.cursor.setMonth(state.cursor.getMonth() - 1); loadMonth(); });
  nextBtn?.addEventListener('click', () => { state.cursor.setMonth(state.cursor.getMonth() + 1); loadMonth(); });
  todayBtn?.addEventListener('click', () => { state.cursor = new Date(); loadMonth(); });

  // Init
  const params = new URLSearchParams(location.search);
  const focusISO = params.get('date');
  if (focusISO) {
    const d = new Date(focusISO + 'T00:00:00');
    if (!isNaN(d)) state.cursor = d;
  }
  loadMonth();
})();
