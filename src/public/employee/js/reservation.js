// Reservations — list, filter, search, CSV export, add/edit with mini calendar & slots.
// This version is API-enabled and uses real data from the backend.

// ===== API endpoints =====
// Employee Appointments UI (reused reservation screen)
const API_CLIENTS = '/clients/get-all';
const API_PETS    = '/pets/get-all';
const API_LIST    = '/appointments?limit=100&offset=0';
const API_CREATE  = '/appointments';
const API_UPDATE  = (id) => `/appointments/${encodeURIComponent(id)}`;

// ===== State =====
let CLIENTS = [];
let PETS    = [];
let RES     = []; // reservations: { id, date, time, purpose, ownerId, petId, status, notes }

// ===== Fetch helper =====
const fetchJSON = async (url, options = {}, timeoutMs = 15000) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: ctl.signal,
      ...options
    });
    clearTimeout(t);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    clearTimeout(t);
    console.error('reservation fetch error', e);
    return { ok:false, status:0, body:{ message: e.message } };
  }
};

// ===== Helpers =====
const byId = (arr, id) => arr.find(x => String(x.id) === String(id));
const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
    month:'short', day:'2-digit', year:'numeric'
  });
const pad2 = n => String(n).padStart(2,'0');

const toCSV = (rows) => {
  if (!rows.length) return 'id,date,time,purpose,owner,pet,status,notes';
  const header = 'id,date,time,purpose,owner,pet,status,notes';
  const lines = rows.map(r => {
    const owner = byId(CLIENTS, r.ownerId)?.name || `#${r.ownerId}`;
    const pet   = byId(PETS, r.petId)?.name || `#${r.petId}`;
    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    };
    return [
      esc(r.id),
      esc(r.date),
      esc(r.time),
      esc(r.purpose),
      esc(owner),
      esc(pet),
      esc(r.status),
      esc(r.notes)
    ].join(',');
  });
  return [header, ...lines].join('\n');
};

// ===== DOM =====
const tbody      = document.getElementById('resTbody');
const filters    = document.getElementById('filters');
const addBtn     = document.getElementById('addReservationBtn');
const exportBtn  = document.getElementById('exportCsvBtn');
const searchBox  = document.getElementById('searchBox');

const modal        = document.getElementById('resModal');
const form         = document.getElementById('resForm');
const fId          = document.getElementById('resId');
const ownerSelect  = document.getElementById('ownerSelect');
const petSelect    = document.getElementById('petSelect');
const purposeInput = document.getElementById('purposeInput');
const notesInput   = document.getElementById('notesInput');
const dateInput    = document.getElementById('dateInput');
const timeInput    = document.getElementById('timeInput');

// mini calendar / slots
const miniMonth = document.getElementById('miniMonth');
const miniGrid  = document.getElementById('miniGrid');
const slotList  = document.getElementById('slotList');
const calPrev   = document.getElementById('calPrev');
const calNext   = document.getElementById('calNext');
const calToday  = document.getElementById('calToday');

let filterStatus = 'all';
let searchText   = '';
let pickerCursor = new Date();
let pickedDate   = null; // Date object
let pickedTime   = null; // "HH:MM"

// ===== Render List Table =====
const statusBadge = (s) =>
  `<span class="badge ${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;

const rowHTML = r => {
  const owner = byId(CLIENTS, r.ownerId)?.name || `#${r.ownerId}`;
  const pet   = byId(PETS, r.petId)?.name || `#${r.petId}`;

  const actions =
    r.status === 'pending'
      ? `<button class="btn btn--confirm" data-act="confirm" data-id="${r.id}">Confirm</button>
         <button class="btn btn--cancel"  data-act="cancel"  data-id="${r.id}">Cancel</button>
         <button class="btn btn--edit"    data-act="edit"    data-id="${r.id}">Edit</button>`
    : r.status === 'confirmed'
      ? `<button class="btn btn--complete" data-act="complete" data-id="${r.id}">Complete</button>
         <button class="btn btn--cancel"   data-act="cancel"   data-id="${r.id}">Cancel</button>
         <button class="btn btn--edit"     data-act="edit"     data-id="${r.id}">Edit</button>`
      : `<button class="btn btn--edit" data-act="edit" data-id="${r.id}">Edit</button>`;

  return `
    <tr>
      <td>${r.id}</td>
      <td>${fmtDate(r.date)}</td>
      <td>${r.time || ''}</td>
      <td>${r.purpose || ''}</td>
      <td>${owner}</td>
      <td>${pet}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${r.notes || ''}</td>
      <td class="actions">
        ${actions}
      </td>
    </tr>
  `;
};

const renderList = () => {
  const q = searchText.trim().toLowerCase();

  const list = RES
    .filter(r => filterStatus === 'all' ? true : r.status === filterStatus)
    .filter(r => {
      if (!q) return true;
      const owner = (byId(CLIENTS, r.ownerId)?.name || '').toLowerCase();
      const pet   = (byId(PETS, r.petId)?.name || '').toLowerCase();
      const purpose = (r.purpose || '').toLowerCase();
      return owner.includes(q) || pet.includes(q) || purpose.includes(q);
    })
    .sort((a,b)=> (a.date + a.time).localeCompare(b.date + b.time));

  tbody.innerHTML = list.length
    ? list.map(rowHTML).join('')
    : `<tr><td colspan="9" style="padding:12px;color:#667085"><em>No appointments.</em></td></tr>`;
};

// ===== Row actions (confirm / complete / cancel / edit) =====
const normalizeDateTime = (dateTime) => {
  if (!dateTime) return { date: null, time: null };
  if (typeof dateTime === 'object' && typeof dateTime.toDate === 'function') {
    const d = dateTime.toDate();
    return {
      date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
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
      if (timePart.includes('Z')) timePart = timePart.replace('Z','');
      const [h, m] = timePart.split(':');
      timePart = `${pad2(Number(h) || 0)}:${pad2(Number(m) || 0)}`;
    }

    return { date: datePart, time: timePart || null };
  }

  return { date: null, time: null };
};

// Appointment schema normalization
const normalizeReservation = (raw) => {
  const dt = normalizeDateTime(raw.dateTime || raw.date || null);
  const statusRaw = (raw.status || '').toString();
  const status = statusRaw ? statusRaw.toLowerCase() : 'pending';

  return {
    id: raw.id,
    date: raw.date || dt.date,
    time: raw.time || dt.time,
    purpose: raw.purpose || raw.service || '',
    ownerId: raw.ownerId || raw.clientId,
    petId: raw.petId,
    notes: raw.notes || '',
    status: ['pending','confirmed','completed','cancelled'].includes(status) ? status : 'pending'
  };
};

const updateReservationStatus = async (id, newStatus) => {
  const statusTitle = newStatus ? (newStatus.charAt(0).toUpperCase() + newStatus.slice(1)) : newStatus;
  const res = await fetchJSON(API_UPDATE(id), {
    method: 'PUT',
    body: JSON.stringify({ status: statusTitle })
  });

  if (!res.ok || !res.body || res.body.success === false) {
    alert(res.body?.message || 'Failed to update appointment.');
    return;
  }

    const updated = res.body.appointment || res.body.reservation || res.body.item || null;
  if (updated) {
    RES = RES.map(r => String(r.id) === String(id) ? normalizeReservation(updated) : r);
  } else {
    RES = RES.map(r => String(r.id) === String(id) ? { ...r, status: newStatus } : r);
  }

  renderList();
  renderMiniCal();
};

document.getElementById('resTable').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.act;

  if (act === 'confirm')  return updateReservationStatus(id, 'confirmed');
  if (act === 'complete') return updateReservationStatus(id, 'completed');
  if (act === 'cancel')   return updateReservationStatus(id, 'cancelled');
  if (act === 'edit')     return openEdit(id);
});

// ===== Filters, Search, Export =====
filters.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  filters.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
  pill.classList.add('active');
  
  filterStatus = pill.dataset.status || 'all';
  renderList();
});

searchBox.addEventListener('input', (e) => {
  searchText = e.target.value || '';
  renderList();
});

exportBtn.addEventListener('click', () => {
  const q = searchText.trim().toLowerCase();
  const list = RES
    .filter(r => filterStatus === 'all' ? true : r.status === filterStatus)
    .filter(r => {
      if (!q) return true;
      const owner = (byId(CLIENTS, r.ownerId)?.name || '').toLowerCase();
      const pet   = (byId(PETS, r.petId)?.name || '').toLowerCase();
      const purpose = (r.purpose || '').toLowerCase();
      return owner.includes(q) || pet.includes(q) || purpose.includes(q);
    })
    .sort((a,b)=> (a.date + a.time).localeCompare(b.date + b.time));

  const csv = toCSV(list);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reservations_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// ===== Modal helpers =====
const openModal = () => {
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
};
const closeModal = () => {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
};
document.querySelectorAll('[data-close-modal]').forEach(btn =>
  btn.addEventListener('click', closeModal)
);

// ===== Owner/Pet linking =====
const fillOwners = () => {
  ownerSelect.innerHTML = '<option value="" disabled selected>Select owner…</option>' +
    CLIENTS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
};

const fillPetsForOwner = (ownerId) => {
  const pets = PETS.filter(p => String(p.ownerId) === String(ownerId));
  petSelect.innerHTML = pets.length
    ? pets.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')
    : '<option value="" disabled selected>No pets found</option>';
};
ownerSelect.addEventListener('change', (e)=> fillPetsForOwner(e.target.value));

// ===== Mini Calendar + Slots =====
const monthLabel = (d) => d.toLocaleString('en-US', { month:'long', year:'numeric' });
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

function renderMiniCal() {
  miniMonth.textContent = monthLabel(pickerCursor);
  [...miniGrid.querySelectorAll('.day')].forEach(n => n.remove());

  const first = new Date(pickerCursor.getFullYear(), pickerCursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  for (let i=0;i<42;i++){
    const cur = new Date(start); cur.setDate(start.getDate()+i);
    const inMonth = cur.getMonth() === pickerCursor.getMonth();
    const iso = toISO(cur);

    const day = document.createElement('div');
    day.className = 'day' + (inMonth ? '' : ' other');
    if (pickedDate && iso === toISO(pickedDate)) day.classList.add('selected');
    if (RES.some(r => r.date === iso)) day.classList.add('marked');

    day.textContent = cur.getDate();
    day.addEventListener('click', () => {
      pickedDate = new Date(cur); dateInput.value = iso;
      renderMiniCal();
      renderSlots();
    });

    miniGrid.appendChild(day);
  }
}

// Time slots 08:00–17:00 every 30 minutes
function renderSlots() {
  slotList.innerHTML = '';
  if (!pickedDate) return;
  for (let h=8; h<=17; h++){
    for (let m of [0,30]) {
      const t = `${pad2(h)}:${pad2(m)}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.textContent = t;
      if (timeInput.value === t) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        slotList.querySelectorAll('.slot.selected').forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');
        pickedTime = t; timeInput.value = t;
      });
      slotList.appendChild(btn);
    }
  }
}

calPrev.addEventListener('click', ()=>{ pickerCursor.setMonth(pickerCursor.getMonth()-1); renderMiniCal(); });
calNext.addEventListener('click', ()=>{ pickerCursor.setMonth(pickerCursor.getMonth()+1); renderMiniCal(); });
calToday.addEventListener('click', ()=>{ pickerCursor = new Date(); renderMiniCal(); });

// ===== Open Add / Edit =====
const resetForm = () => {
  form.reset();
  fId.value = '';
  pickedDate = null;
  pickedTime = null;
};

addBtn.addEventListener('click', () => {
  resetForm();
  document.getElementById('resModalTitle').textContent = 'Add Reservation';
  openModal();
  pickerCursor = new Date();
  renderMiniCal();
  renderSlots();
});

const openEdit = (id) => {
  const item = RES.find(x => String(x.id) === String(id));
  if (!item) return;

  resetForm();
  document.getElementById('resModalTitle').textContent = 'Edit Appointment';
  fId.value = item.id;
  ownerSelect.value = item.ownerId;
  fillPetsForOwner(item.ownerId);
  petSelect.value = item.petId;
  purposeInput.value = item.purpose || '';
  notesInput.value = item.notes || '';
  dateInput.value = item.date;
  timeInput.value = item.time;
  pickedDate = new Date(item.date + 'T00:00:00');
  pickedTime = item.time;

  pickerCursor = new Date(pickedDate);
  renderMiniCal();
  renderSlots();

  openModal();
};

// ===== Submit form (create / update) =====
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!ownerSelect.value || !petSelect.value || !dateInput.value || !timeInput.value) {
    alert('Please complete owner, pet, date, and time.');
    return;
  }

  const payload = {
    date: dateInput.value,
    time: timeInput.value,
    purpose: (purposeInput.value || '').trim(),
    clientId: ownerSelect.value,
    petId: petSelect.value,
    notes: (notesInput.value || '').trim()
  };

  let res;
  if (!fId.value) {
    // Create
    res = await fetchJSON(API_CREATE, {
      method:'POST',
      body: JSON.stringify(payload)
    });

    if (!res.ok || !res.body || res.body.success === false) {
      alert(res.body?.message || 'Failed to create appointment.');
      return;
    }

    const newRes = res.body.appointment || res.body.reservation || res.body.item || res.body;
    if (newRes) {
      RES.push(normalizeReservation(newRes));
    }
  } else {
    // Update
    const id = fId.value;
    res = await fetchJSON(API_UPDATE(id), {
      method:'PUT',
      body: JSON.stringify(payload)
    });

    if (!res.ok || !res.body || res.body.success === false) {
    alert(res.body?.message || 'Failed to update appointment.');
      return;
    }

    const updated = res.body.appointment || res.body.reservation || res.body.item || null;
    if (updated) {
      RES = RES.map(r => String(r.id) === String(id) ? normalizeReservation(updated) : r);
    } else {
      RES = RES.map(r => String(r.id) === String(id) ? { ...r, ...payload, ownerId: payload.clientId } : r);
    }
  }

  closeModal();
  renderMiniCal(); // update day marks
  renderList();
});

// ===== Hydrate from API =====
const hydrateFromAPI = async () => {
  // Load clients
  const cliRes = await fetchJSON(API_CLIENTS, { method: 'GET' });
  if (cliRes.ok && Array.isArray(cliRes.body)) {
    CLIENTS = cliRes.body.map(c => ({
      id: c.id,
      name: c.full_name || c.name || c.fullName || c.email || `Client #${c.id}`
    }));
  }

  // Load pets
  const petRes = await fetchJSON(API_PETS, { method: 'GET' });
  if (petRes.ok && Array.isArray(petRes.body)) {
    PETS = petRes.body.map(p => ({
      id: p.id,
      ownerId: p.ownerId,
      name: p.name || `Pet #${p.id}`
    }));
  }

  fillOwners();

  // Load reservations
  const resRes = await fetchJSON(API_LIST, { method: 'GET' });
  if (resRes.ok) {
    const body = resRes.body;
    const items = Array.isArray(body) ? body
                : Array.isArray(body.items) ? body.items
                : [];
    RES = items.map(normalizeReservation);
  }
};

// ===== Init =====
(async function bootstrap(){
  await hydrateFromAPI();
  renderList();
  pickerCursor = new Date();
  renderMiniCal();
})();
