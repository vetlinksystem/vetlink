// Reservations — list, filter, search, CSV export, add/edit with mini calendar & slots.
// Dummy data now; API calls are commented for later.

// ===== Dummy master data =====
const CLIENTS = [
  { id:1, name:"Ken Lloyd Billones" },
  { id:2, name:"Rena Rita" },
  { id:3, name:"Mario Toledo" },
  { id:4, name:"Alyssa Cruz" },
];
const PETS = [
  { id:101, ownerId:1, name:"Buddy" },
  { id:104, ownerId:1, name:"Rex" },
  { id:102, ownerId:2, name:"Mittens" },
  { id:103, ownerId:3, name:"Chirpy" },
  { id:105, ownerId:4, name:"Snowy" },
];
// Reservations dataset (id, date ISO, time "HH:MM", purpose, ownerId, petId, status, notes)
// STATUS VALUES: 'pending' | 'confirmed' | 'completed' | 'cancelled'
let RES = [
  { id:1, date:"2025-10-03", time:"09:00", purpose:"Vaccination", ownerId:1, petId:101, status:"confirmed", notes:"" },
  { id:2, date:"2025-10-03", time:"10:15", purpose:"Check-up",   ownerId:2, petId:102, status:"pending",   notes:"requested by app" },
  { id:3, date:"2025-10-07", time:"14:00", purpose:"Grooming",   ownerId:3, petId:103, status:"confirmed", notes:"" },
  { id:4, date:"2025-10-14", time:"08:30", purpose:"Deworming",  ownerId:1, petId:104, status:"completed", notes:"" },
  { id:5, date:"2025-10-14", time:"13:00", purpose:"Dental",     ownerId:4, petId:105, status:"cancelled", notes:"owner called" },
];

// ===== API endpoints (enable later) =====
// const API_LIST   = '/reservations?limit=100&offset=0';
// const API_CREATE = '/reservations';
// const API_UPDATE = (id) => `/reservations/${id}`;
// const fetchJSON = async (url, options = {}, timeoutMs=15000) => {
//   const ctl = new AbortController(); const t=setTimeout(()=>ctl.abort(),timeoutMs);
//   try {
//     const res = await fetch(url, { credentials:'include', headers:{'Accept':'application/json','Content-Type':'application/json'}, signal:ctl.signal, ...options });
//     clearTimeout(t);
//     const body = await res.json().catch(()=> ({}));
//     return { ok:res.ok, status:res.status, body };
//   } catch(e){ clearTimeout(t); return { ok:false, status:0, body:{message:e.message} }; }
// };

// ===== Helpers =====
const byId = (arr, id) => arr.find(x => x.id === id);
const fmtDate = (iso) => new Date(iso+'T00:00:00').toLocaleDateString('en-PH',{month:'short', day:'2-digit', year:'numeric'});
const pad2 = n => String(n).padStart(2,'0');

// ===== DOM =====
const tbody = document.getElementById('resTbody');
const filters = document.getElementById('filters');
const addBtn = document.getElementById('addReservationBtn');
const exportBtn = document.getElementById('exportCsvBtn');
const searchBox = document.getElementById('searchBox');

const modal = document.getElementById('resModal');
const form = document.getElementById('resForm');
const modalTitle = document.getElementById('resModalTitle');

const fId = document.getElementById('resId');
const ownerSelect = document.getElementById('ownerSelect');
const petSelect = document.getElementById('petSelect');
const purposeInput = document.getElementById('purposeInput');
const notesInput = document.getElementById('notesInput');
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');

// mini calendar / slots
const miniMonth = document.getElementById('miniMonth');
const miniGrid = document.getElementById('miniGrid');
const slotList = document.getElementById('slotList');
const calPrev = document.getElementById('calPrev');
const calNext = document.getElementById('calNext');
const calToday = document.getElementById('calToday');

let filterStatus = 'all';
let searchText = '';
let pickerCursor = new Date();
let pickedDate = null;   // Date object
let pickedTime = null;   // "HH:MM"

// ===== Render List Table =====
const statusBadge = (s) => `<span class="badge ${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</span>`;

const rowHTML = r => {
  const owner = byId(CLIENTS, r.ownerId)?.name || `#${r.ownerId}`;
  const pet = byId(PETS, r.petId)?.name || `#${r.petId}`;

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
      <td>${r.time}</td>
      <td>${r.purpose}</td>
      <td><a href="/employee/user?id=${r.ownerId}">${owner}</a></td>
      <td><a href="/employee/pet?id=${r.petId}">${pet}</a></td>
      <td>${statusBadge(r.status)}</td>
      <td class="actions">${actions}</td>
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
    .sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time));

  tbody.innerHTML = list.length
    ? list.map(rowHTML).join('')
    : `<tr><td colspan="8" style="padding:12px;color:#667085"><em>No reservations.</em></td></tr>`;
};

// Event delegation for actions
document.getElementById('resTable').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = +btn.dataset.id;
  const act = btn.dataset.act;

  // Update dummy dataset (replace with API later)
  const item = RES.find(x => x.id === id);
  if (!item) return;
  if (act === 'confirm')  item.status = 'confirmed';
  if (act === 'complete') item.status = 'completed';
  if (act === 'cancel')   item.status = 'cancelled';
  if (act === 'edit')     openEdit(id);

  renderList();
});

// ===== Filters, Search, Export =====
filters.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  filters.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
  pill.classList.add('active');
  filterStatus = pill.dataset.status; // lowercase values
  renderList();
});

searchBox.addEventListener('input', (e) => {
  searchText = e.target.value || '';
  renderList();
});

const toCSV = (rows) => {
  const header = ['ID','Date','Time','Purpose','Owner','Pet','Status','Notes'];
  const lines = rows.map(r => {
    const owner = byId(CLIENTS, r.ownerId)?.name || `#${r.ownerId}`;
    const pet = byId(PETS, r.petId)?.name || `#${r.petId}`;
    const fields = [ r.id, r.date, r.time, r.purpose || '', owner, pet, r.status, (r.notes || '') ];
    return fields.map(v => {
      const s = String(v).replace(/"/g,'""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',');
  });
  return [header.join(','), ...lines].join('\n');
};

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
    .sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time));

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
const openModal = () => { modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); };
const closeModal = () => {
  modal.classList.remove('show'); modal.setAttribute('aria-hidden','true');
  form.reset(); fId.value=''; pickedDate=null; pickedTime=null; dateInput.value=''; timeInput.value='';
  renderSlots();
};
document.querySelectorAll('[data-close-modal]').forEach(x => x.addEventListener('click', closeModal));

// ===== Owner/Pet linking =====
const fillOwners = () => {
  ownerSelect.innerHTML = '<option value="" disabled selected>Select owner…</option>' +
    CLIENTS.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
};
const fillPetsForOwner = (ownerId) => {
  const pets = PETS.filter(p => p.ownerId === +ownerId);
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

const BUSINESS_START = 8;  // 8 AM
const BUSINESS_END   = 17; // 5 PM
const SLOT_EVERY_MIN = 30;
const existingTimesOn = (iso) => RES.filter(r => r.date === iso).map(r => r.time);

function renderSlots(){
  slotList.innerHTML = '';
  const iso = pickedDate ? toISO(pickedDate) : null;
  if (!iso){
    slotList.innerHTML = '<div style="color:#667085">Pick a date first.</div>';
    return;
  }
  const taken = new Set(existingTimesOn(iso));
  for (let h=BUSINESS_START; h<BUSINESS_END; h++){
    for (let m=0; m<60; m+=SLOT_EVERY_MIN){
      const t = `${pad2(h)}:${pad2(m)}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot' + (taken.has(t) ? ' unavailable' : '');
      btn.textContent = t;
      if (!taken.has(t)) {
        btn.addEventListener('click', () => {
          slotList.querySelectorAll('.slot.selected').forEach(s => s.classList.remove('selected'));
          btn.classList.add('selected');
          pickedTime = t; timeInput.value = t;
        });
      }
      slotList.appendChild(btn);
    }
  }
}

calPrev.addEventListener('click', ()=>{ pickerCursor.setMonth(pickerCursor.getMonth()-1); renderMiniCal(); });
calNext.addEventListener('click', ()=>{ pickerCursor.setMonth(pickerCursor.getMonth()+1); renderMiniCal(); });
calToday.addEventListener('click', ()=>{ pickerCursor = new Date(); renderMiniCal(); });

// ===== Open Add / Edit =====
addBtn.addEventListener('click', () => {
  modalTitle.textContent = 'Add Reservation';
  form.reset(); fId.value='';
  fillOwners(); petSelect.innerHTML = '<option value="" disabled selected>Select owner first…</option>';
  pickerCursor = new Date(); pickedDate=null; pickedTime=null; dateInput.value=''; timeInput.value='';
  renderMiniCal(); renderSlots();
  openModal();
});

function openEdit(id){
  const r = RES.find(x=>x.id===id); if (!r) return;
  modalTitle.textContent = 'Edit Reservation';
  fillOwners(); ownerSelect.value = r.ownerId;
  fillPetsForOwner(r.ownerId); petSelect.value = r.petId;
  purposeInput.value = r.purpose; notesInput.value = r.notes || '';
  fId.value = r.id;

  pickerCursor = new Date(r.date + 'T00:00:00'); pickedDate = new Date(r.date + 'T00:00:00'); dateInput.value = r.date;
  pickedTime = r.time; timeInput.value = r.time;
  renderMiniCal(); renderSlots();
  slotList.querySelectorAll('.slot').forEach(s => { if (s.textContent === r.time && !s.classList.contains('unavailable')) s.classList.add('selected'); });
  openModal();
}

// ===== Save (Create / Update) =====
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!ownerSelect.value || !petSelect.value || !dateInput.value || !timeInput.value || !purposeInput.value.trim()) return;

  const payload = {
    date: dateInput.value,
    time: timeInput.value,
    purpose: purposeInput.value.trim(),
    notes: (notesInput.value || '').trim(),
    ownerId: +ownerSelect.value,
    petId: +petSelect.value,
    status: 'pending'
  };

  if (!fId.value) {
    const id = Math.max(0, ...RES.map(r=>r.id)) + 1;
    RES.push({ id, ...payload });
    // API: await fetchJSON(API_CREATE, { method:'POST', body: JSON.stringify(payload) });
  } else {
    const id = +fId.value;
    RES = RES.map(r => r.id===id ? { ...r, ...payload } : r);
    // API: await fetchJSON(API_UPDATE(id), { method:'PUT', body: JSON.stringify(payload) });
  }

  closeModal();
  renderMiniCal(); // update day marks
  renderList();
});

// ===== Init =====
(function bootstrap(){
  renderList();
  renderMiniCal();
  // API LIST:
  // fetchJSON(API_LIST).then(({ok,body}) => { if (ok) { RES = body.items || body || []; renderList(); renderMiniCal(); } });
})();
