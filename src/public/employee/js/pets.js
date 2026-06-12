// Manage Pets — list, filters, pagination.
// Breeding matchmaking/approvals live on the dedicated /employee/breeding page.

/* ===========================================================
   📡 API CONTRACT

   1) List pets
      GET  /pets/get-all
      → [ {
          id, name, breed, species, sex, age,
          ownerId,            // owner ID
          ownerName?,         // optional, used if present
          breedingAllowed     // boolean
        } ]
   =========================================================== */

const API_PETS_LIST = '/pets/get-all';

// --- small fetch helper ---
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

// ===== Pets data (filled from API) =====
let PETS = [];

// ===== Pagination state =====
let page = 1;
let pageSize = 10;
let lastFilteredCount = 0;

// ===== Helpers =====
const ownerName = (id) => {
  const p = PETS.find(p => String(p.ownerId) === String(id));
  return p?.ownerName || `#${id}`;
};

// ===== DOM =====
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

let search = '';

// ===== API hydrate =====
const hydrateFromAPI = async () => {
  const petsRes = await fetchJSON(API_PETS_LIST);
  if (petsRes.ok && Array.isArray(petsRes.body)) {
    PETS = petsRes.body;
  }
};

// ===== Populate filter dropdowns =====
const distinct = (arr) => [...new Set(arr)].sort((a,b)=> String(a).localeCompare(String(b)));
const syncFilters = () => {
  const species = distinct(PETS.map(p=>p.species));
  const breeds  = distinct(PETS.map(p=>p.breed));
  filterSpecies.innerHTML = '<option value="">All species</option>' +
    species.map(s=>`<option value="${s}">${s}</option>`).join('');
  filterBreed.innerHTML   = '<option value="">All breeds</option>' +
    breeds.map(s=>`<option value="${s}">${s}</option>`).join('');
};

// ===== Pets table =====
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
        <button class="btn btn-view" data-view="${p.id}">View</button>
      </div>
    </td>
  </tr>
`;

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

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (page > totalPages) page = totalPages;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  petsMeta.textContent = `${items.length ? start + 1 : 0}-${Math.min(start + pageSize, totalItems)} of ${totalItems}`;
  petsTbody.innerHTML = items.length ? items.map(petRow).join('') :
    `<tr><td colspan="9" style="padding:12px;color:#667085"><em>No pets matched.</em></td></tr>`;

  petsTbody.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => location.href = `/employee/pet?id=${btn.dataset.view}`);
  });

  // Pager footer
  petsCountEl.textContent = totalItems
    ? `Showing ${start + 1}–${Math.min(start + pageSize, totalItems)} of ${totalItems}`
    : 'No results';

  // Pager buttons
  const windowSize = 5;
  let startPage = Math.max(1, page - Math.floor(windowSize / 2));
  let endPage = Math.min(totalPages, startPage + windowSize - 1);
  if (endPage - startPage + 1 < windowSize) startPage = Math.max(1, endPage - windowSize + 1);

  pgPages.innerHTML = '';
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-tool' + (i === page ? ' active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => {
      page = i;
      renderPets();
    });
    pgPages.appendChild(btn);
  }

  pgFirst.disabled = page === 1;
  pgPrev.disabled  = page === 1;
  pgNext.disabled  = page === totalPages;
  pgLast.disabled  = page === totalPages;
};

// ===== Pagination controls =====
pgFirst.addEventListener('click', () => { page = 1; renderPets(); });
pgPrev.addEventListener('click',  () => { if (page>1) page--; renderPets(); });
pgNext.addEventListener('click',  () => { page++; renderPets(); });
pgLast.addEventListener('click',  () => {
  page = Math.max(1, Math.ceil(lastFilteredCount / pageSize));
  renderPets();
});
pageSizeSel.addEventListener('change', ()=>{
  pageSize = +pageSizeSel.value || 10;
  page = 1; renderPets();
});

// ===== Events =====
searchBox.addEventListener('input', (e)=> { search = e.target.value || ''; page = 1; renderPets(); });
filterSpecies.addEventListener('change', ()=> { page = 1; renderPets(); });
filterBreed.addEventListener('change', ()=> { page = 1; renderPets(); });
filterSex.addEventListener('change', ()=> { page = 1; renderPets(); });
onlyBreeding.addEventListener('change', ()=> { page = 1; renderPets(); });

// ===== Init =====
const bootstrap = async () => {
  await hydrateFromAPI();
  syncFilters();
  renderPets();
};
bootstrap();
