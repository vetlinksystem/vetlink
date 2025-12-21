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

  const modal       = document.getElementById('apptModal');
  const modalTitle  = document.getElementById('apptModalTitle');
  const petSelect   = document.getElementById('aPet');
  const dateInput   = document.getElementById('aDate');
  const timeInput   = document.getElementById('aTime');
  const serviceInput= document.getElementById('aService');
  const notesInput  = document.getElementById('aNotes');
  const submitBtn   = document.getElementById('aSubmit');

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

  // Modal helpers
  const openModal = () => {
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
  };
  document.querySelectorAll('#apptModal [data-close]').forEach(btn =>
    btn.addEventListener('click', closeModal)
  );

  // Table row
  const rowHTML = (a) => `
    <tr>
      <td>${fmtDate(a.date)} ${a.time || ''}</td>
      <td>${esc(a.petName)}</td>
      <td>${esc(a.service)}</td>
      <td>${statusBadge(a.status)}</td>
      <td>${esc(a.notes || '')}</td>
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
      : `<tr><td colspan="5" style="padding:.75rem;color:var(--muted)"><em>No appointments found.</em></td></tr>`;

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

  // Book buttons
  const openBooking = () => {
    if (!petSelect) return;
    // Reset form
    modalTitle.textContent = 'Book Appointment';
    if (PETS.length) {
      petSelect.innerHTML = PETS.map(p =>
        `<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.species || '')})</option>`
      ).join('');
    } else {
      petSelect.innerHTML = '<option disabled>No pets found</option>';
    }

    const todayISO = new Date().toISOString().slice(0,10);
    dateInput.value = todayISO;
    timeInput.value = '';
    serviceInput.value = '';
    notesInput.value = '';

    openModal();
  };

  if (bookBtn) bookBtn.addEventListener('click', openBooking);
  if (addApptBtn) addApptBtn.addEventListener('click', openBooking);

  // Submit booking
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (!petSelect.value || !dateInput.value || !timeInput.value) {
        showToast('Please select pet, date, and time.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';

      const payload = {
        petId: petSelect.value,
        date: dateInput.value,
        time: timeInput.value,
        service: (serviceInput.value || '').trim() || 'Check-up',
        notes: (notesInput.value || '').trim()
      };

      const { ok, body } = await fetchJSON(API_CREATE, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      submitBtn.disabled = false;
      submitBtn.textContent = 'Save';

      if (!ok || !body || body.success === false) {
        showToast(body?.message || 'Failed to book appointment.');
        return;
      }

      const a = body.appointment || null;
      if (a) {
        // normalize for table
        const norm = {
          id: a.id,
          petId: a.petId,
          petName: PETS.find(p => String(p.id) === String(a.petId))?.name || 'Pet',
          service: a.purpose || a.service || 'Appointment',
          date: payload.date,
          time: payload.time,
          status: 'Pending',
          notes: payload.notes
        };
        APPTS.push(norm);
      }

      closeModal();
      showToast('Appointment requested.');
      renderTable();
    });
  }

  // Hydrate: pets + appointments
  (async function bootstrap() {
    // Load pets for dropdown
    const petsRes = await fetchJSON(API_MY_PETS, { method: 'GET' });
    if (petsRes.ok && petsRes.body && petsRes.body.success !== false) {
      PETS = Array.isArray(petsRes.body.pets) ? petsRes.body.pets : [];
    }

    // Load appointments
    const apRes = await fetchJSON(API_MY_APPTS, { method: 'GET' });
    if (!apRes.ok || !apRes.body || apRes.body.success === false) {
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" style="padding:.75rem;color:var(--muted)">
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
