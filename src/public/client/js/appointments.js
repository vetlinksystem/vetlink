/* ===========================================================
   CLIENT — APPOINTMENTS (LIST + BOOK)
   -----------------------------------------------------------
   APIs:
     GET  /client/appointments/my
     GET  /client/pets/my
     POST /client/appointments
   =========================================================== */

(function () {
  const API_MY_APPTS = '/client/appointments/my';
  const API_MY_PETS  = '/client/pets/my';
  const API_CREATE   = '/client/appointments';

  const fetchJSON = async (url, options = {}, timeoutMs = 15000) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        signal: ctl.signal,
        ...options
      });
      clearTimeout(t);
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body };
    } catch (err) {
      clearTimeout(t);
      console.error('client appointments fetch error', err);
      return { ok:false, status:0, body:{ message: err.message } };
    }
  };

  const esc = (s) =>
    (s ?? '').toString().replace(/[&<>\"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));

  const pad2 = (n) => String(n).padStart(2,'0');

  const fmtDate = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
      month:'short', day:'2-digit', year:'numeric'
    });

  // DOM
  const tableBody   = document.querySelector('#apptTable tbody');
  const pageInfo    = document.getElementById('apptPageInfo');
  const prevBtn     = document.getElementById('prevAppt');
  const nextBtn     = document.getElementById('nextAppt');
  const statusFilter= document.getElementById('statusFilter');
  const searchBox   = document.getElementById('apptSearch');
  const bookBtn     = document.getElementById('bookBtn'); // header button
  const addApptBtn  = document.getElementById('addApptBtn'); // page button

  const listView    = document.getElementById('apptListView');
  const bookView    = document.getElementById('bookView');
  const bookBack    = document.getElementById('bookBack');
  const stepItems   = document.querySelectorAll('#bookSteps li');
  const calMonth    = document.getElementById('calMonth');
  const calDays     = document.getElementById('calDays');
  const calPrev     = document.getElementById('calPrev');
  const calNext     = document.getElementById('calNext');
  const pickedDateLabel = document.getElementById('pickedDateLabel');
  const pickedDayLabel  = document.getElementById('pickedDayLabel');
  const slotList    = document.getElementById('slotList');
  const toPetBtn    = document.getElementById('toPetBtn');
  const toConfirmBtn= document.getElementById('toConfirmBtn');
  const summary     = document.getElementById('bookSummary');
  const petSelect   = document.getElementById('aPet');
  const serviceInput= document.getElementById('aService');
  const notesInput  = document.getElementById('aNotes');
  const submitBtn   = document.getElementById('aSubmit');
  const slotHint    = document.getElementById('aSlotHint');

  const toast       = document.getElementById('toast');

  if (!tableBody) return; // Not on appointments page

  // State
  let APPTS = [];
  let PETS  = [];
  let search = '';
  let filterStatus = 'all';
  let page = 1;
  const pageSize = 8;

  // Toast helper
  const showToast = (msg) => {
    if (!toast) { alert(msg); return; }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 2200);
  };

  // Table row
  // Payment is over-the-counter only — the clinic marks it paid on site.
  const paymentBadge = (a) => {
    const paid = String(a.paymentStatus || 'unpaid').toLowerCase() === 'paid';
    return `<span class="badge ${paid ? 'completed' : 'pending'}" title="Over the counter">${paid ? 'Paid' : 'Unpaid'}</span>`;
  };

  // Surface the clinic's reason whenever an appointment was rescheduled or cancelled.
  const notesCell = (a) => {
    const notes = a.notes ? `<div>${esc(a.notes)}</div>` : '';
    if (!a.statusReason) return notes;
    const label = a.reasonType === 'rescheduled' ? 'Rescheduled' : 'Cancelled';
    return `${notes}<div class="reason-note"><b>${label}:</b> ${esc(a.statusReason)}</div>`;
  };

  const rowHTML = (a) => `
    <tr>
      <td>${fmtDate(a.date)} ${a.time || ''}</td>
      <td>${esc(a.petName)}</td>
      <td>${esc(a.service)}</td>
      <td>${statusBadge(a.status)}</td>
      <td>${paymentBadge(a)}</td>
      <td>${notesCell(a)}</td>
    </tr>
  `;

  const statusBadge = (s) => {
    const st = (s || '').toString();
    let cls = '';
    if (st === 'Pending') cls = 'pending';
    else if (st === 'Confirmed') cls = 'confirmed';
    else if (st === 'Completed') cls = 'completed';
    else if (st === 'Cancelled') cls = 'cancelled';
    return `<span class="badge ${cls}">${esc(st)}</span>`;
  };

  const renderTable = () => {
    const q = (search || '').trim().toLowerCase();
    const list = APPTS
      .filter(a => filterStatus === 'all' ? true : a.status === filterStatus)
      .filter(a => {
        if (!q) return true;
        return [a.petName, a.service, a.status].some(v =>
          String(v || '').toLowerCase().includes(q)
        );
      })
      .sort((a,b)=> (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize);

    tableBody.innerHTML = items.length
      ? items.map(rowHTML).join('')
      : `<tr><td colspan="6" style="padding:.75rem;color:var(--muted)"><em>No appointments found.</em></td></tr>`;

    if (pageInfo) {
      pageInfo.textContent = items.length
        ? `${start + 1}–${Math.min(start + pageSize, total)} of ${total}`
        : `0–0 of 0`;
    }

    if (prevBtn) prevBtn.disabled = page === 1;
    if (nextBtn) nextBtn.disabled = page === totalPages;
  };

  // Pagination events
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (page > 1) page--;
    renderTable();
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    page++;
    renderTable();
  });

  // Filters
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      filterStatus = e.target.value || 'all';
      page = 1;
      renderTable();
    });
  }

  if (searchBox) {
    searchBox.addEventListener('input', (e) => {
      search = e.target.value || '';
      page = 1;
      renderTable();
    });
  }

  // ===== Booking view =====
  // Service + date + time on one screen, then pet details, then a confirmation.
  // Clinic hours (Monday–Saturday, 8:00 AM–5:00 PM, 30-minute slots) and the daily
  // limit are decided by the server — GET /appointments/availability returns every
  // slot of a day with its state, and the server checks again when the booking is saved.
  const API_AVAILABILITY = '/appointments/availability';
  const CLOSED_WEEKDAYS = [0]; // Sunday

  let pickedDate = '';   // 'YYYY-MM-DD'
  let pickedTime = '';   // 'HH:MM'
  let pickedLabel = '';  // '9:00 AM – 9:30 AM'
  let calCursor = new Date();

  const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const showScreen = (n) => {
    document.querySelectorAll('#bookView [data-screen]').forEach(el =>
      el.classList.toggle('hidden', el.getAttribute('data-screen') !== String(n)));
    // The first screen covers steps 1 and 2 (service, then date & time).
    const reached = n === 1 ? 2 : n;
    stepItems.forEach(li =>
      li.classList.toggle('active', Number(li.getAttribute('data-step')) <= reached));
  };

  const renderCalendar = () => {
    const today = new Date();
    const todayISO = toISO(today);
    const year = calCursor.getFullYear();
    const month = calCursor.getMonth();

    calMonth.textContent = calCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    // No point paging back before the current month.
    calPrev.disabled = year === today.getFullYear() && month === today.getMonth();

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = '';
    for (let i = 0; i < first.getDay(); i++) html += '<button class="cal-day other" disabled></button>';
    for (let d = 1; d <= daysInMonth; d++) {
      const cur = new Date(year, month, d);
      const iso = toISO(cur);
      const closed = iso < todayISO || CLOSED_WEEKDAYS.includes(cur.getDay());
      const cls = ['cal-day', iso === todayISO ? 'today' : '', iso === pickedDate ? 'selected' : '']
        .filter(Boolean).join(' ');
      html += `<button type="button" class="${cls}" data-date="${iso}" ${closed ? 'disabled' : ''}>${d}</button>`;
    }
    calDays.innerHTML = html;
  };

  const SLOT_TAGS = { available: 'Available', taken: 'Booked', past: 'Passed', full: 'Day full' };

  const loadSlots = async () => {
    pickedTime = ''; pickedLabel = '';
    toPetBtn.disabled = true;
    slotHint.classList.remove('warn');

    if (!pickedDate) {
      slotList.innerHTML = '<div class="slots-empty">Select a date to see the available times.</div>';
      return;
    }

    const date = pickedDate;
    slotList.innerHTML = '<div class="slots-empty">Checking availability…</div>';
    const { ok, body } = await fetchJSON(`${API_AVAILABILITY}?date=${encodeURIComponent(date)}`);
    if (date !== pickedDate) return; // another day was picked while this one loaded

    if (!ok || body?.success === false) {
      slotList.innerHTML = `<div class="slots-empty">${esc(body?.message || 'Could not load the time slots.')}</div>`;
      return;
    }

    const slots = Array.isArray(body.slots) ? body.slots : [];
    slotHint.textContent = `Clinic hours: ${body.hours || 'Monday–Saturday, 8:00 AM–5:00 PM'}.`;

    if (body.open === false || !slots.length) {
      slotList.innerHTML = '<div class="slots-empty">The clinic is closed on this day.</div>';
      return;
    }
    if (body.full) {
      slotHint.textContent = `This day is fully booked (max ${body.maxPerDay} appointments). Please choose another date.`;
      slotHint.classList.add('warn');
    }

    slotList.innerHTML = slots.map(sl => `
      <button type="button" class="slot" role="radio" aria-checked="false"
              data-time="${esc(sl.time)}" data-label="${esc(sl.label)}"
              ${sl.status === 'available' ? '' : 'disabled'}>
        ${esc(sl.label)}
        <span class="tag">${SLOT_TAGS[sl.status] || esc(sl.status)}</span>
      </button>`).join('');
  };

  calDays.addEventListener('click', (e) => {
    const day = e.target.closest('.cal-day[data-date]');
    if (!day || day.disabled) return;
    pickedDate = day.getAttribute('data-date');
    const d = new Date(pickedDate + 'T00:00:00');
    pickedDateLabel.textContent = d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    pickedDayLabel.textContent = d.toLocaleDateString('en-PH', { weekday: 'long' });
    renderCalendar();
    loadSlots();
  });

  calPrev.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
  calNext.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });

  slotList.addEventListener('click', (e) => {
    const slot = e.target.closest('.slot');
    if (!slot || slot.disabled) return;
    slotList.querySelectorAll('.slot').forEach(s => {
      s.classList.toggle('selected', s === slot);
      s.setAttribute('aria-checked', s === slot ? 'true' : 'false');
    });
    pickedTime = slot.getAttribute('data-time');
    pickedLabel = slot.getAttribute('data-label');
    toPetBtn.disabled = false;
  });

  const closeBooking = () => {
    bookView.classList.add('hidden');
    listView.classList.remove('hidden');
  };

  const openBooking = () => {
    petSelect.innerHTML = PETS.length
      ? PETS.map(p => `<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.species || '')})</option>`).join('')
      : '<option value="" disabled selected>No pets found</option>';

    pickedDate = ''; pickedTime = ''; pickedLabel = '';
    calCursor = new Date(); calCursor.setDate(1);
    serviceInput.selectedIndex = 0;
    notesInput.value = '';
    pickedDateLabel.textContent = 'Choose a date';
    pickedDayLabel.textContent = '';

    renderCalendar();
    loadSlots();
    showScreen(1);
    listView.classList.add('hidden');
    bookView.classList.remove('hidden');
  };

  if (bookBtn) bookBtn.addEventListener('click', openBooking);
  if (addApptBtn) addApptBtn.addEventListener('click', openBooking);
  bookBack.addEventListener('click', closeBooking);

  document.querySelectorAll('#bookView [data-goto]').forEach(btn =>
    btn.addEventListener('click', () => showScreen(Number(btn.getAttribute('data-goto')))));

  toPetBtn.addEventListener('click', () => {
    if (!pickedDate || !pickedTime) { showToast('Please select a date and a time slot.'); return; }
    showScreen(3);
  });

  toConfirmBtn.addEventListener('click', () => {
    if (!petSelect.value) { showToast('Please add a pet first.'); return; }
    const rows = [
      ['Service', serviceInput.options[serviceInput.selectedIndex]?.text || serviceInput.value],
      ['Date', `${pickedDateLabel.textContent} (${pickedDayLabel.textContent})`],
      ['Time', pickedLabel],
      ['Pet', petSelect.options[petSelect.selectedIndex]?.text || ''],
      ['Payment', 'Over the counter (pay at the clinic)'],
      ['Notes', (notesInput.value || '').trim() || '—']
    ];
    summary.innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    showScreen(4);
  });

  // Submit booking
  submitBtn.addEventListener('click', async () => {
    if (!petSelect.value || !pickedDate || !pickedTime) {
      showToast('Please select pet, date, and time.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const payload = {
      petId: petSelect.value,
      date: pickedDate,
      time: pickedTime,
      service: (serviceInput.value || '').trim() || 'Check-up',
      notes: (notesInput.value || '').trim(),
      // Over-the-counter is the only supported method (settled at the clinic).
      paymentMethod: 'over_the_counter'
    };

    const { ok, body } = await fetchJSON(API_CREATE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Booking';

    if (!ok || !body || body.success === false) {
      showToast(body?.message || 'Failed to book appointment.');
      // The slot may have been taken in the meantime — show the fresh list.
      showScreen(1);
      loadSlots();
      return;
    }

    const a = body.appointment || null;
    if (a) {
      // normalize for table
      APPTS.push({
        id: a.id,
        petId: a.petId,
        petName: PETS.find(p => String(p.id) === String(a.petId))?.name || 'Pet',
        service: a.purpose || a.service || 'Appointment',
        date: payload.date,
        time: payload.time,
        status: 'Pending',
        notes: payload.notes,
        reasonType: '',
        statusReason: '',
        paymentMethod: 'over_the_counter',
        paymentStatus: 'unpaid'
      });
    }

    closeBooking();
    showToast('Appointment requested.');
    renderTable();
  });

  // Hydrate: pets + appointments
  (async function bootstrap() {
    // Load pets for dropdown
    const petsRes = await fetchJSON(API_MY_PETS, { method: 'GET' });
    if (petsRes.ok && petsRes.body && petsRes.body.success !== false) {
      PETS = Array.isArray(petsRes.body.pets) ? petsRes.body.pets : [];
    }

    // Arriving from the dashboard's "Book appointment" quick action.
    if (new URLSearchParams(location.search).get('book') === '1') {
      openBooking();
      history.replaceState(null, '', location.pathname);
    }

    // Load appointments
    const apRes = await fetchJSON(API_MY_APPTS, { method: 'GET' });
    if (!apRes.ok || !apRes.body || apRes.body.success === false) {
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding:.75rem;color:var(--muted)">
          <em>Failed to load appointments. ${esc(apRes.body?.message || '')}</em>
        </td></tr>`;
      }
      return;
    }

    APPTS = Array.isArray(apRes.body.appointments)
      ? apRes.body.appointments
      : [];

    renderTable();
  })();
})();
