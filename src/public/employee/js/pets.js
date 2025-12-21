// Manage Pets with Breeding — API-ready version
// Keeps all original behavior (filters, pagination, matchmaking, board).

/* ===========================================================
   📡 API CONTRACT (recommended)

   1) List pets
      GET  /pets/get-all
      → [ {
          id, name, breed, species, sex, age,
          ownerId, ownerName,        // ownerName for display
          breedingAllowed            // boolean
        } ]

   2) List breeding records
      GET  /breeding/get-all
      → [ { id, petAId, petBId, requestedAt, status, notes } ]

   3) Create breeding proposal
      POST /breeding/add
      Body: { petAId, petBId, notes }
      → { success:true, id, record:{...} }

   4) Update breeding status
      PUT  /breeding/update-status
      Body: { id, status }          // status: pending|confirmed|completed|cancelled|declined
      → { success:true }
   =========================================================== */

const API_PETS_LIST   = '/pets/get-all';
const API_BREED_LIST  = '/breeding/get-all';
const API_BREED_CREATE = '/breeding/add';
const API_BREED_UPDATE = '/breeding/update-status';

// --- small fetch helper (used where APIs are enabled) ---
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
  } catch (err) {
    clearTimeout(t);
    console.error('pets fetch error:', err);
    return { ok: false, status: 0, body: { message: err.message } };
  }
};

// ===== Dummy master data (used if API not available yet) =====
let PETS = [
  { id:101, name:"Buddy",   breed:"Golden Retriever", species:"Dog", sex:"Male",   age:2, ownerId:1, ownerName:"Ken Lloyd Billones", breedingAllowed:true },
  { id:106, name:"Nala",    breed:"Golden Retriever", species:"Dog", sex:"Female", age:3, ownerId:4, ownerName:"Alyssa Cruz",       breedingAllowed:true },
  { id:107, name:"Max",     breed:"Golden Retriever", species:"Dog", sex:"Male",   age:4, ownerId:3, ownerName:"Mario Toledo",      breedingAllowed:true },
  { id:108, name:"Luna",    breed:"Golden Retriever", species:"Dog", sex:"Female", age:2, ownerId:2, ownerName:"Rena Rita",         breedingAllowed:true },
  { id:104, name:"Rex",     breed:"German Shepherd",  species:"Dog", sex:"Male",   age:5, ownerId:1, ownerName:"Ken Lloyd Billones",breedingAllowed:true },
  { id:109, name:"Bella",   breed:"German Shepherd",  species:"Dog", sex:"Female", age:4, ownerId:2, ownerName:"Rena Rita",         breedingAllowed:true },
  { id:110, name:"Ghost",   breed:"Siberian Husky",   species:"Dog", sex:"Male",   age:3, ownerId:4, ownerName:"Alyssa Cruz",       breedingAllowed:true },
  { id:111, name:"Mika",    breed:"Siberian Husky",   species:"Dog", sex:"Female", age:2, ownerId:3, ownerName:"Mario Toledo",      breedingAllowed:true },
  { id:112, name:"Thor",    breed:"Siberian Husky",   species:"Dog", sex:"Male",   age:5, ownerId:2, ownerName:"Rena Rita",         breedingAllowed:true },
  { id:102, name:"Mittens", breed:"Persian",          species:"Cat", sex:"Female", age:3, ownerId:2, ownerName:"Rena Rita",         breedingAllowed:true },
  { id:105, name:"Snowy",   breed:"Persian",          species:"Cat", sex:"Female", age:1, ownerId:4, ownerName:"Alyssa Cruz",       breedingAllowed:true },
  { id:113, name:"Shadow",  breed:"Persian",          species:"Cat", sex:"Male",   age:2, ownerId:3, ownerName:"Mario Toledo",      breedingAllowed:true },
  { id:114, name:"Whiskers",breed:"Siamese",          species:"Cat", sex:"Male",   age:4, ownerId:1, ownerName:"Ken Lloyd Billones",breedingAllowed:true },
  { id:115, name:"Cleo",    breed:"Siamese",          species:"Cat", sex:"Female", age:3, ownerId:4, ownerName:"Alyssa Cruz",       breedingAllowed:true },
  { id:103, name:"Chirpy",  breed:"Cockatiel",        species:"Bird", sex:"Male",   age:1, ownerId:3, ownerName:"Mario Toledo",     breedingAllowed:false },
  { id:116, name:"Sunny",   breed:"Cockatiel",        species:"Bird", sex:"Female", age:2, ownerId:1, ownerName:"Ken Lloyd Billones",breedingAllowed:true },
  { id:117, name:"Snowball",breed:"Angora",           species:"Rabbit", sex:"Male",   age:1, ownerId:2, ownerName:"Rena Rita",      breedingAllowed:true },
  { id:118, name:"Fluffy",  breed:"Angora",           species:"Rabbit", sex:"Female", age:2, ownerId:3, ownerName:"Mario Toledo",   breedingAllowed:true },
];

// Breeding records
let BREED = [
  { id:1, petAId:101, petBId:106, requestedAt:"2025-10-05T09:10:00", status:"pending",  notes:"Initial proposal from clinic." },
  { id:2, petAId:102, petBId:105, requestedAt:"2025-10-06T11:22:00", status:"confirmed", notes:"Owners agreed to proceed." },
];

// ===== Pagination state =====
let page = 1;
let pageSize = 10;
let lastFilteredCount = 0;

// ===== Helpers =====
const byId = (arr, id) => arr.find(x => String(x.id) === String(id));
const ownerName = (id) => {
  const p = PETS.find(p => String(p.ownerId) === String(id));
  return p?.ownerName || `#${id}`;
};
const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH',{month:'short', day:'2-digit', year:'numeric'}) + ' ' +
         d.toLocaleTimeString('en-PH',{hour:'2-digit', minute:'2-digit', hour12:false});
};

// ===== DOM refs =====
const petsTbody = document.getElementById('petsTbody');
const petsMeta = document.getElementById('petsMeta');
const petsCountEl = document.getElementById('petsCount');
const pgFirst = document.getElementById('pgFirst');
const pgPrev  = document.getElementById('pgPrev');
const pgNext  = document.getElementById('pgNext');
const pgLast  = document.getElementById('pgLast');
const pgPages = document.getElementById('pgPages');
const pageSizeSel = document.getElementById('pageSize');

const searchBox = document.getElementById('searchBox');
const filterSpecies = document.getElementById('filterSpecies');
const filterBreed = document.getElementById('filterBreed');
const filterSex = document.getElementById('filterSex');
const onlyBreeding = document.getElementById('onlyBreeding');

const matchPetSelect = document.getElementById('matchPetSelect');
const matchSummary = document.getElementById('matchSummary');
const excludeSameOwner = document.getElementById('excludeSameOwner');
const matchesWrap = document.getElementById('matchesWrap');
const refreshMatchesBtn = document.getElementById('refreshMatchesBtn');

const breedTbody = document.getElementById('breedTbody');
const boardFilterBtns = document.querySelectorAll('[data-bstatus]');

const proposeModal = document.getElementById('proposeModal');
const proposeForm = document.getElementById('proposeForm');
const pPetA = document.getElementById('pPetA');
const pPetB = document.getElementById('pPetB');
const pA = document.getElementById('pA');
const pB = document.getElementById('pB');
const pNotes = document.getElementById('pNotes');

let search = '';
let bFilter = 'all';

// ===== API hydrate (optional; keeps dummy as fallback) =====
const hydrateFromAPI = async () => {
  // Pets
  const petsRes = await fetchJSON(API_PETS_LIST);
  if (petsRes.ok && Array.isArray(petsRes.body)) {
    PETS = petsRes.body;
  }

  // Breeding board
  const breedRes = await fetchJSON(API_BREED_LIST);
  if (breedRes.ok && Array.isArray(breedRes.body)) {
    BREED = breedRes.body;
  }
};

// ===== Populate filter dropdowns =====
const distinct = (arr) => [...new Set(arr)].sort((a,b)=> String(a).localeCompare(String(b)));
const syncFilters = () => {
  const species = distinct(PETS.map(p=>p.species));
  const breeds  = distinct(PETS.map(p=>p.breed));
  filterSpecies.innerHTML = '<option value="">All species</option>' + species.map(s=>`<option value="${s}">${s}</option>`).join('');
  filterBreed.innerHTML   = '<option value="">All breeds</option>'  + breeds.map(s=>`<option value="${s}">${s}</option>`).join('');
  matchPetSelect.innerHTML = PETS.filter(p=>p.breedingAllowed).map(p=>`
    <option value="${p.id}">${p.name} • ${p.sex} • ${p.breed} (${p.species}) — ${ownerName(p.ownerId)}</option>
  `).join('') || '<option disabled>No pets available for breeding</option>';
};

// ===== Pets list (with pagination) =====
const petRow = (p) => `
  <tr>
    <td>${p.id}</td>
    <td><a href="/employee/pet?id=${p.id}">${p.name}</a></td>
    <td>${p.breed}</td>
    <td>${p.species}</td>
    <td>${p.sex === 'Male' ? '<span class="badge sex-m">Male</span>' : '<span class="badge sex-f">Female</span>'}</td>
    <td>${p.age}</td>
    <td><a href="/employee/user?id=${p.ownerId}">${ownerName(p.ownerId)}</a></td>
    <td>${p.breedingAllowed ? '<span class="badge ok">Allowed</span>' : '<span class="badge no">Not allowed</span>'}</td>
    <td>
      <div class="row-actions">
        <button class="btn btn-view"  data-view="${p.id}">View</button>
        <button class="btn btn-match" data-match="${p.id}">Match</button>
      </div>
    </td>
  </tr>
`;

const renderPager = (cur, totalPages, start, totalItems) => {
  petsCountEl.textContent = totalItems ? `Showing ${start + 1}–${Math.min(start + pageSize, totalItems)} of ${totalItems}` : 'No results';
  pgFirst.disabled = cur <= 1;  pgPrev.disabled = cur <= 1;
  pgNext.disabled  = cur >= totalPages; pgLast.disabled = cur >= totalPages;
  const makeBtn = (n, active=false) => `<button class="page-btn${active?' active':''}" data-goto="${n}">${n}</button>`;
  let html = '';
  const windowSize = 5;
  let startPage = Math.max(1, cur - Math.floor(windowSize/2));
  let endPage = Math.min(totalPages, startPage + windowSize - 1);
  if (endPage - startPage + 1 < windowSize) startPage = Math.max(1, endPage - windowSize + 1);
  for (let i = startPage; i <= endPage; i++) html += makeBtn(i, i===cur);
  pgPages.innerHTML = html;
  pgPages.querySelectorAll('[data-goto]').forEach(b=>{
    b.addEventListener('click', ()=> { page = +b.dataset.goto; renderPets(); });
  });
};

const renderPets = () => {
  const q = search.trim().toLowerCase();
  const s = filterSpecies.value;
  const b = filterBreed.value;
  const sx = filterSex.value;
  const only = onlyBreeding.checked;

  const filtered = PETS.filter(p =>
    (!s || p.species===s) &&
    (!b || p.breed===b) &&
    (!sx || p.sex===sx) &&
    (!only || p.breedingAllowed) &&
    (!q || [p.name, p.breed, ownerName(p.ownerId)].some(v=>String(v).toLowerCase().includes(q)))
  ).sort((a,b)=> String(a.name).localeCompare(String(b.name)));

  lastFilteredCount = filtered.length;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (page > pageCount) page = pageCount;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  petsMeta.textContent = `${items.length ? start + 1 : 0}-${Math.min(start + pageSize, filtered.length)} of ${filtered.length}`;
  petsTbody.innerHTML = items.length ? items.map(petRow).join('') :
    `<tr><td colspan="9" style="padding:12px;color:#667085"><em>No pets matched.</em></td></tr>`;

  petsTbody.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => location.href = `/employee/pet?id=${btn.dataset.view}`);
  });
  petsTbody.querySelectorAll('[data-match]').forEach(btn => {
    btn.addEventListener('click', () => selectForMatch(+btn.dataset.match));
  });

  renderPager(page, pageCount, start, filtered.length);
};

// ===== Matchmaking =====
const compatible = (a, b, excludeSameOwnerFlag) =>
  a.id !== b.id &&
  a.species === b.species &&
  a.breed === b.breed &&
  a.sex !== b.sex &&
  a.breedingAllowed && b.breedingAllowed &&
  (!excludeSameOwnerFlag || a.ownerId !== b.ownerId);

const suggestionCard = (a, b) => `
  <div class="match-card">
    <div class="match-title">${a.breed} (${a.species})</div>
    <div class="pair">
      <div class="pet-mini">
        <div class="name"><a href="/employee/pet?id=${a.id}">${a.name}</a> • ${a.sex}</div>
        <div class="meta">Owner: <a href="/employee/user?id=${a.ownerId}">${ownerName(a.ownerId)}</a></div>
      </div>

      <div class="pair-symbol heart"></div>

      <div class="pet-mini">
        <div class="name"><a href="/employee/pet?id=${b.id}">${b.name}</a> • ${b.sex}</div>
        <div class="meta">Owner: <a href="/employee/user?id=${b.ownerId}">${ownerName(b.ownerId)}</a></div>
      </div>
    </div>
    <div class="pair-actions">
      <button class="btn btn-tool" data-swap="${a.id}|${b.id}">Swap A/B</button>
      <button class="btn btn-confirm" data-propose="${a.id}|${b.id}">Propose Breeding</button>
    </div>
  </div>
`;

const renderMatches = () => {
  const baseId = +matchPetSelect.value || 0;
  const base = PETS.find(p=>p.id===baseId);

  if (base){
    matchSummary.innerHTML = `
      <span class="chip">
        <strong>${base.name}</strong>
        <span class="sex ${base.sex === 'Male' ? 'm' : 'f'}">${base.sex}</span>
        <span>${base.breed} (${base.species})</span>
        <span>• Owner: <a href="/employee/user?id=${base.ownerId}">${ownerName(base.ownerId)}</a></span>
      </span>`;
  } else matchSummary.innerHTML = '';

  if (!base) { matchesWrap.innerHTML = '<div class="muted">Select a pet to see suggestions.</div>'; return; }

  const list = PETS.filter(p => compatible(base, p, excludeSameOwner.checked))
                   .sort((x,y)=> String(x.ownerId).localeCompare(String(y.ownerId)));

  if (!list.length) { matchesWrap.innerHTML = '<div class="muted">No compatible matches found.</div>'; return; }

  matchesWrap.innerHTML = list.map(p => suggestionCard(base, p)).join('');

  matchesWrap.querySelectorAll('[data-swap]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [aid,bid] = btn.dataset.swap.split('|').map(Number);
      const a = byId(PETS, aid), b = byId(PETS, bid);
      matchesWrap.innerHTML = suggestionCard(b, a);
      matchesWrap.querySelector('[data-propose]').addEventListener('click', () => openPropose(b.id, a.id));
      matchesWrap.querySelector('[data-swap]').addEventListener('click', () => {
        matchesWrap.innerHTML = suggestionCard(a, b);
        matchesWrap.querySelector('[data-propose]').addEventListener('click', () => openPropose(a.id, b.id));
      });
    });
  });
  matchesWrap.querySelectorAll('[data-propose]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [aid,bid] = btn.dataset.propose.split('|').map(Number);
      openPropose(aid, bid);
    });
  });
};

const selectForMatch = (petId) => {
  if (!PETS.some(p => p.id === petId)) return;
  matchPetSelect.value = String(petId);
  renderMatches();
  const section = document.getElementById('matchSection');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ===== Breeding board =====
const statusBadge = (s) => {
  const label = s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
  return `<span class="badge ${s.toLowerCase()}">${label}</span>`;
};

const breedRow = (r) => {
  const A = byId(PETS, r.petAId), B = byId(PETS, r.petBId);
  const owners = `${ownerName(A?.ownerId)} • ${ownerName(B?.ownerId)}`;
  const specbreed = `${A?.species || '?'} / ${A?.breed || '?'}`;
  return `
    <tr>
      <td>${r.id}</td>
      <td><a href="/employee/pet?id=${A?.id}">${A?.name || '#'+r.petAId}</a> × <a href="/employee/pet?id=${B?.id}">${B?.name || '#'+r.petBId}</a></td>
      <td>${owners}</td>
      <td>${specbreed}</td>
      <td>${fmtDateTime(r.requestedAt)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <div class="row-actions">
          ${r.status==='pending'   ? `<button class="btn btn-confirm"  data-bconfirm="${r.id}">Confirm</button>` : ''}
          ${r.status==='confirmed' ? `<button class="btn btn-complete" data-bcomplete="${r.id}">Complete</button>` : ''}
          ${r.status!=='completed' && r.status!=='cancelled' && r.status!=='declined'
             ? `<button class="btn btn-cancel"   data-bcancel="${r.id}">Cancel</button>` : ''}
          ${r.status==='pending' ? `<button class="btn btn-decline"  data-bdecline="${r.id}">Decline</button>` : ''}
        </div>
      </td>
    </tr>
  `;
};

const renderBoard = () => {
  const list = BREED.filter(r => bFilter==='all' ? true : r.status === bFilter)
                    .sort((a,b)=> a.requestedAt.localeCompare(b.requestedAt));
  breedTbody.innerHTML = list.length ? list.map(breedRow).join('') :
    `<tr><td colspan="7" style="padding:12px;color:#667085"><em>No breeding records.</em></td></tr>`;

  breedTbody.querySelectorAll('[data-bconfirm]').forEach(b => b.addEventListener('click', () => updateBreedStatus(+b.dataset.bconfirm, 'confirmed')));
  breedTbody.querySelectorAll('[data-bcomplete]').forEach(b => b.addEventListener('click', () => updateBreedStatus(+b.dataset.bcomplete, 'completed')));
  breedTbody.querySelectorAll('[data-bcancel]').forEach(b => b.addEventListener('click', () => updateBreedStatus(+b.dataset.bcancel, 'cancelled')));
  breedTbody.querySelectorAll('[data-bdecline]').forEach(b => b.addEventListener('click', () => updateBreedStatus(+b.dataset.bdecline, 'declined')));
};

const updateBreedStatus = async (id, status) => {
  BREED = BREED.map(r => r.id===id ? { ...r, status } : r);
  renderBoard();

  // Backend call (optional, non-blocking):
  // await fetchJSON(API_BREED_UPDATE, {
  //   method:'PUT',
  //   body: JSON.stringify({ id, status })
  // });
};

// ===== Propose modal =====
const showModal = (el, show) => {
  if (show){
    el.classList.add('show');
    el.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
  } else {
    el.classList.remove('show');
    el.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  }
};

document.querySelectorAll('[data-close-modal]').forEach(x =>
  x.addEventListener('click', () => showModal(x.closest('.modal'), false))
);

const openPropose = (petAId, petBId) => {
  const A = byId(PETS, petAId), B = byId(PETS, petBId);
  pPetA.value = petAId; pPetB.value = petBId;
  pA.innerHTML = `<p><strong>${A.name}</strong> • ${A.sex} • ${A.breed} (${A.species})</p><p class="muted">Owner: <a href="/employee/user?id=${A.ownerId}">${ownerName(A.ownerId)}</a></p>`;
  pB.innerHTML = `<p><strong>${B.name}</strong> • ${B.sex} • ${B.breed} (${B.species})</p><p class="muted">Owner: <a href="/employee/user?id=${B.ownerId}">${ownerName(B.ownerId)}</a></p>`;
  showModal(proposeModal, true);
};

proposeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const petAId = +pPetA.value; const petBId = +pPetB.value;
  const notes = (pNotes.value || '').trim();
  if (!petAId || !petBId) return;
  const id = Math.max(0, ...BREED.map(x=>x.id)) + 1;

  const localRecord = { id, petAId, petBId, requestedAt: new Date().toISOString(), status: 'pending', notes };
  BREED.unshift(localRecord);
  renderBoard();
  pNotes.value = '';
  showModal(proposeModal, false);

  // Backend call (optional):
  // await fetchJSON(API_BREED_CREATE, {
  //   method:'POST',
  //   body: JSON.stringify({ petAId, petBId, notes })
  // });
});

// ===== Events =====
searchBox.addEventListener('input', (e)=> { search = e.target.value || ''; page = 1; renderPets(); });
filterSpecies.addEventListener('change', ()=> { page = 1; renderPets(); });
filterBreed.addEventListener('change', ()=> { page = 1; renderPets(); });
filterSex.addEventListener('change', ()=> { page = 1; renderPets(); });
onlyBreeding.addEventListener('change', ()=> { page = 1; renderPets(); });

matchPetSelect.addEventListener('change', renderMatches);
excludeSameOwner.addEventListener('change', renderMatches);
refreshMatchesBtn.addEventListener('click', renderMatches);

boardFilterBtns.forEach(btn => btn.addEventListener('click', () => {
  boardFilterBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  bFilter = btn.dataset.bstatus;
  renderBoard();
}));

pgFirst.addEventListener('click', ()=> { page = 1; renderPets(); });
pgPrev .addEventListener('click', ()=> { if (page>1) page--; renderPets(); });
pgNext .addEventListener('click', ()=> { page++; renderPets(); });
pgLast .addEventListener('click', ()=> {
  const totalPages = Math.max(1, Math.ceil(lastFilteredCount / pageSize));
  page = totalPages; renderPets();
});
pageSizeSel.addEventListener('change', ()=>{
  pageSize = +pageSizeSel.value || 10;
  page = 1; renderPets();
});

// ===== Init =====
const bootstrap = async () => {
  await hydrateFromAPI();   // will override dummy data if APIs are ready
  syncFilters();
  renderPets();
  renderMatches();
  renderBoard();
};
bootstrap();
