// Schedule calendar — vanilla JS with dummy data now; API calls commented and ready.

// ====== Dummy schedules ======
/*
  Fields:
  id, date: 'YYYY-MM-DD', start: 'HH:MM', end?: 'HH:MM',
  purpose, ownerId, ownerName, petId, petName, status ('ok'|'warn'|'cancel')
*/
const D_SCHEDULES = [
  { id: 1, date: '2025-10-03', start: '09:00', end: '09:30', purpose: 'Vaccination', ownerId: 1, ownerName: 'Ken Lloyd Billones', petId: 101, petName: 'Buddy', status: 'ok' },
  { id: 2, date: '2025-10-03', start: '10:15', end: '10:45', purpose: 'Check-up', ownerId: 2, ownerName: 'Rena Rita', petId: 102, petName: 'Mittens', status: 'ok' },
  { id: 3, date: '2025-10-07', start: '14:00', end: '14:30', purpose: 'Grooming', ownerId: 3, ownerName: 'Mario Toledo', petId: 103, petName: 'Chirpy', status: 'warn' },
  { id: 4, date: '2025-10-14', start: '08:30', end: '09:00', purpose: 'Deworming', ownerId: 1, ownerName: 'Ken Lloyd Billones', petId: 104, petName: 'Rex', status: 'ok' },
  { id: 5, date: '2025-10-14', start: '13:00', end: '13:45', purpose: 'Dental', ownerId: 4, ownerName: 'Alyssa Cruz', petId: 105, petName: 'Snowy', status: 'ok' },
  { id: 6, date: '2025-10-22', start: '15:00', end: '15:30', purpose: 'Follow-up', ownerId: 2, ownerName: 'Rena Rita', petId: 102, petName: 'Mittens', status: 'ok' },
];

// ====== API wiring (enable later) ======
// const API_LIST = (fromISO, toISO) => `/schedules?from=${fromISO}&to=${toISO}`;
// const fetchJSON = async (url, timeoutMs = 15000) => {
//   const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), timeoutMs);
//   try {
//     const res = await fetch(url, { credentials:'include', headers:{'Accept':'application/json'}, signal:ctl.signal });
//     clearTimeout(t); const body = await res.json(); return { ok:res.ok, status:res.status, body };
//   } catch (e) { clearTimeout(t); return { ok:false, status:0, body:{ message:e.message } }; }
// };

const pad2 = (n) => String(n).padStart(2,'0');
const toISODate = (y,m,d) => `${y}-${pad2(m+1)}-${pad2(d)}`;
const parseISO = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };

const state = {
  cursor: new Date(),  // month being shown
  data: [],            // events loaded for the visible month range
};

// DOM
const elMonth = document.getElementById('calMonth');
const elRange = document.getElementById('calRange');
const grid = document.getElementById('calGrid');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');
const pop = document.getElementById('popover');
const popTitle = document.getElementById('popoverTitle');
const popBody = document.getElementById('popoverBody');
const popClose = pop.querySelector('.popover-close');

const monthLabel = (d) =>
  d.toLocaleString('en-US', { month: 'long', year: 'numeric' });

const rangeLabel = (start, end) =>
  `${start.toLocaleDateString('en-US', { month:'short', day:'2-digit' })} – ` +
  `${end.toLocaleDateString('en-US', { month:'short', day:'2-digit' })}`;

const sameDate = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

const groupByDate = (items) => {
  const map = {};
  for (const e of items) {
    (map[e.date] ||= []).push(e);
  }
  return map;
};

const statusToMarker = (status) => {
  if (status === 'warn') return 'marker warn';
  if (status === 'cancel') return 'marker danger';
  return 'marker';
};

// Popover
const closePopover = () => {
  pop.classList.remove('show');
  pop.setAttribute('aria-hidden', 'true');
};
popClose.addEventListener('click', closePopover);
document.addEventListener('click', (e) => {
  if (e.target === pop) closePopover();
});

// Position popover next to the clicked cell
const openPopover = (anchorRect, title, events) => {
  popTitle.textContent = title;
  popBody.innerHTML = events.map(ev => `
    <div class="event">
      <div class="when">${ev.start}${ev.end ? ' – ' + ev.end : ''}</div>
      <div class="purpose">${ev.purpose}</div>
      <div class="meta">Owner: <a class="link" href="/user.html?id=${ev.ownerId}">${ev.ownerName}</a> •
        Pet: <a class="link" href="/pet.html?id=${ev.petId}">${ev.petName}</a>
      </div>
    </div>
  `).join('');

  pop.classList.add('show');
  pop.setAttribute('aria-hidden', 'false');

  const card = pop.querySelector('.popover-card');
  // compute position (right side of cell if room; else left; else below)
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

// Render calendar month grid
const render = () => {
  const d = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
  const year = d.getFullYear();
  const month = d.getMonth();

  elMonth.textContent = monthLabel(d);

  // start on the Sunday of first week
  const firstDow = d.getDay(); // 0 Sun..6 Sat
  const start = new Date(year, month, 1 - firstDow);
  // end on Saturday of the last week (42 cells total)
  const end = new Date(start);
  end.setDate(start.getDate() + 41);

  elRange.textContent = rangeLabel(start, end);

  // group events by date string
  const grouped = groupByDate(state.data);

  // clear old day cells
  // keep 7 DOW header items at top (already in HTML), so remove everything after them
  [...grid.querySelectorAll('.cal-day, .empty-day')].forEach(n => n.remove());

  const today = new Date();
  for (let i = 0; i < 42; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    const inMonth = cur.getMonth() === month;
    const dateISO = toISODate(cur.getFullYear(), cur.getMonth(), cur.getDate());
    const dayEvents = grouped[dateISO] || [];

    const cell = document.createElement('div');
    cell.className = 'cal-day' + (inMonth ? '' : ' other');
    if (sameDate(cur, today)) cell.classList.add('today');

    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = cur.getDate();

    const markers = document.createElement('div');
    markers.className = 'markers';
    // up to 4 colored dots for first 4 events
    dayEvents.slice(0,4).forEach(e => {
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

    cell.appendChild(num);
    if (dayEvents.length) cell.appendChild(markers);

    // click -> open big popover with day details
    if (dayEvents.length) {
      cell.addEventListener('click', (ev) => {
        openPopover(cell.getBoundingClientRect(),
          cur.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }),
          dayEvents.sort((a,b) => a.start.localeCompare(b.start))
        );
      });
    }

    grid.appendChild(cell);
  }
};

// Load data for the visible month (dummy now; API later)
const loadMonth = async () => {
  // visible month start/end (buffer a week on each side for smoother UX)
  const y = state.cursor.getFullYear(), m = state.cursor.getMonth();
  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 0);
  const from = new Date(monthStart); from.setDate(from.getDate() - 7);
  const to = new Date(monthEnd);     to.setDate(to.getDate() + 7);

  // ----- DUMMY MODE -----
  // filter dummy items within range
  state.data = D_SCHEDULES.filter(s => {
    const d = parseISO(s.date);
    return d >= from && d <= to;
  });
  render();

  // ----- API MODE (enable later) -----
  // const { ok, body } = await fetchJSON(API_LIST(from.toISOString().slice(0,10), to.toISOString().slice(0,10)));
  // if (!ok) { state.data = []; render(); return; }
  // state.data = body.items || body || [];
  // render();
};

// Nav
prevBtn.addEventListener('click', () => { state.cursor.setMonth(state.cursor.getMonth() - 1); loadMonth(); });
nextBtn.addEventListener('click', () => { state.cursor.setMonth(state.cursor.getMonth() + 1); loadMonth(); });
todayBtn.addEventListener('click', () => { state.cursor = new Date(); loadMonth(); });

// Init
// Deep-link: /employee/schedule?date=YYYY-MM-DD
const params = new URLSearchParams(location.search);
const focusISO = params.get('date');
if (focusISO) {
  const d = new Date(focusISO + 'T00:00:00');
  if (!isNaN(d)) state.cursor = d;
}
loadMonth();
