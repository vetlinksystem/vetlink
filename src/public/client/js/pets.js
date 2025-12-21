/* ===========================================================
   CLIENT — MY PETS (API WIRED)
   -----------------------------------------------------------
   API: GET /client/pets/my
   → { success:true, pets:[{id,name,breed,species,sex,age,breedingAllowed}], total }

   Modal IDs (from pets.html):
   - Add button:     #addPetBtn
   - Modal:          #petModal
   - Close buttons:  [data-close]
   - Title:          #petModalTitle
   - Submit:         #pSubmit
   - Inputs:         #pName #pSpecies #pBreed #pAge #pBreeding #pNotes
   =========================================================== */

(function () {
  const API_MY_PETS = '/client/pets/my';
  const API_ADD_PET = '/client/pets';

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
      console.error('client pets fetch error', err);
      return { ok:false, status:0, body:{ message: err.message } };
    }
  };

  const petsGrid    = document.getElementById('petsGrid');
  const petsSummary = document.getElementById('petsSummary');
  const searchBox   = document.getElementById('searchBox');
  const filterSpecies = document.getElementById('filterSpecies');
  const filterSex     = document.getElementById('filterSex');
  const onlyBreedable = document.getElementById('onlyBreedable');

  // Modal elements (based on your pets.html)
  const addPetBtn = document.getElementById('addPetBtn');
  const petModal  = document.getElementById('petModal');
  const petModalTitle = document.getElementById('petModalTitle');
  const pSubmit   = document.getElementById('pSubmit');

  const pName     = document.getElementById('pName');
  const pSpecies  = document.getElementById('pSpecies');
  const pBreed    = document.getElementById('pBreed');
  const pSex      = document.getElementById('pSex');
  const pAge      = document.getElementById('pAge');
  const pBreeding = document.getElementById('pBreeding');
  const pNotes    = document.getElementById('pNotes');

  const toastEl   = document.getElementById('toast');

  const showToast = (msg) => {
    if (window.theToast) return window.theToast(msg);
    if (!toastEl) return alert(msg);
    toastEl.textContent = msg || 'Saved!';
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1800);
  };

  if (!petsGrid) {
    // Page not present
    return;
  }

  let PETS = [];
  let search = '';

  // modal state
  let modalMode = 'add';  // 'add' or 'edit'
  let editingPetId = null;

  const esc = (s) =>
    (s ?? '').toString().replace(/[&<>\"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));

  const distinct = (arr) => [...new Set(arr)].sort((a,b)=> String(a).localeCompare(String(b)));

  const buildCard = (p) => `
    <article class="pet-card" data-pet-id="${esc(p.id)}">
      <header class="pet-header">
        <div class="pet-avatar" aria-hidden="true">
          <span>${esc((p.name || 'P').charAt(0).toUpperCase())}</span>
        </div>
        <div>
          <h2 class="pet-name">${esc(p.name)}</h2>
          <div class="pet-sub">
            ${p.species ? esc(p.species) : 'Pet'} • ${p.breed ? esc(p.breed) : 'No breed set'}
          </div>
        </div>
      </header>

      <dl class="pet-meta">
        <div>
          <dt>Sex</dt>
          <dd>${p.sex ? esc(p.sex) : '—'}</dd>
        </div>
        <div>
          <dt>Age</dt>
          <dd>${typeof p.age === 'number' ? esc(p.age + ' yr(s)') : '—'}</dd>
        </div>
        <div>
          <dt>Breeding</dt>
          <dd>
            ${p.breedingAllowed
              ? '<span class="badge ok">Allowed</span>'
              : '<span class="badge no">Not allowed</span>'}
          </dd>
        </div>
      </dl>

      <!-- Inline details (expanded view) -->
      <section class="pet-details" aria-label="Pet details">
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Name</div>
            <div class="detail-value">${esc(p.name || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Species</div>
            <div class="detail-value">${esc(p.species || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Breed</div>
            <div class="detail-value">${esc(p.breed || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Sex</div>
            <div class="detail-value">${esc(p.sex || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Age</div>
            <div class="detail-value">${typeof p.age === 'number' ? esc(p.age + ' yr(s)') : '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Breeding</div>
            <div class="detail-value">
              ${p.breedingAllowed
                ? '<span class="badge ok">Allowed</span>'
                : '<span class="badge no">Not allowed</span>'}
            </div>
          </div>
          <div class="detail-item span-2">
            <div class="detail-label">Notes</div>
            <div class="detail-value">${p.notes ? esc(p.notes) : '—'}</div>
          </div>
        </div>
      </section>

      <footer class="pet-actions">
        <button type="button" class="btn-ghost js-toggle-details" aria-expanded="false">
          <span class="toggle-text">View details</span>
          <span class="chev" aria-hidden="true">▾</span>
        </button>
      </footer>
    </article>
  `;

  const renderSummary = (list) => {
    if (!petsSummary) return;
    const total = list.length;
    const bySpecies = {};
    list.forEach(p => {
      const key = p.species || 'Other';
      bySpecies[key] = (bySpecies[key] || 0) + 1;
    });

    petsSummary.innerHTML = `
      <div class="summary-pill">
        <strong>${total}</strong>
        <span>total pets</span>
      </div>
      ${Object.entries(bySpecies).map(([sp,count])=>`
        <div class="summary-pill">
          <strong>${count}</strong>
          <span>${esc(sp)}</span>
        </div>
      `).join('')}
    `;
  };

  const renderPets = () => {
    const speciesVal = filterSpecies ? filterSpecies.value : '';
    const sexVal     = filterSex ? filterSex.value : '';
    const onlyBreed  = onlyBreedable ? onlyBreedable.checked : false;
    const q = (search || '').trim().toLowerCase();

    const list = PETS.filter(p =>
      (!speciesVal || p.species === speciesVal) &&
      (!sexVal || p.sex === sexVal) &&
      (!onlyBreed || p.breedingAllowed) &&
      (!q || [p.name, p.breed, p.species]
        .some(v => String(v || '').toLowerCase().includes(q)))
    );

    renderSummary(list);

    if (!list.length) {
      petsGrid.innerHTML =
        `<p class="muted">No pets matched your filters. Try clearing the search or filters.</p>`;
      return;
    }

    petsGrid.innerHTML = list.map(buildCard).join('');
  };

  // -------------------------------
  // Inline "View details" expand/collapse (no navigation)
  // -------------------------------
  const collapseAllCards = (exceptEl = null) => {
    const cards = petsGrid.querySelectorAll('.pet-card.expanded');
    cards.forEach(card => {
      if (exceptEl && card === exceptEl) return;
      card.classList.remove('expanded');
      const btn = card.querySelector('.js-toggle-details');
      if (btn) {
        btn.setAttribute('aria-expanded', 'false');
        const t = btn.querySelector('.toggle-text');
        if (t) t.textContent = 'View details';
      }
    });
  };

  // Event delegation so it still works after re-render
  petsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-toggle-details');
    if (!btn) return;
    e.preventDefault();

    const card = btn.closest('.pet-card');
    if (!card) return;

    const willExpand = !card.classList.contains('expanded');
    collapseAllCards(card);

    card.classList.toggle('expanded', willExpand);
    btn.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
    const t = btn.querySelector('.toggle-text');
    if (t) t.textContent = willExpand ? 'Hide details' : 'View details';

    // When expanding, ensure it scrolls into view on small screens
    if (willExpand) {
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  const syncFilters = () => {
    if (!filterSpecies && !filterSex) return;
    const species = distinct(PETS.map(p => p.species).filter(Boolean));
    const sexes   = distinct(PETS.map(p => p.sex).filter(Boolean));

    if (filterSpecies) {
      filterSpecies.innerHTML = '<option value="">All species</option>' +
        species.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    }
    if (filterSex) {
      filterSex.innerHTML = '<option value="">All</option>' +
        sexes.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    }
  };

  // -------------------------------
  // Modal control (FIX)
  // -------------------------------
  const modalCloseBtns = petModal ? petModal.querySelectorAll('[data-close]') : [];

  const openPetModal = (mode = 'add', pet = null) => {
    if (!petModal) return;

    modalMode = mode;
    editingPetId = pet ? pet.id : null;

    // Title
    if (petModalTitle) {
      petModalTitle.textContent = mode === 'edit' ? 'Edit Pet' : 'Add Pet';
    }

    // Fill / reset form fields
    if (pName) pName.value = pet?.name || '';
    if (pSpecies) pSpecies.value = pet?.species || 'Dog';
    if (pBreed) pBreed.value = pet?.breed || '';
    if (pSex) pSex.value = pet?.sex || '';
    if (pAge) pAge.value = (typeof pet?.age === 'number') ? pet.age : '';
    if (pBreeding) pBreeding.checked = !!pet?.breedingAllowed;
    if (pNotes) pNotes.value = pet?.notes || '';

    // Force show regardless of CSS
    petModal.classList.add('open', 'show', 'active');
    petModal.style.display = 'flex';
    petModal.setAttribute('aria-hidden', 'false');

    // esc closes
    document.addEventListener('keydown', onModalEsc);
  };

  const closePetModal = () => {
    if (!petModal) return;

    petModal.classList.remove('open', 'show', 'active');
    petModal.style.display = 'none';
    petModal.setAttribute('aria-hidden', 'true');

    document.removeEventListener('keydown', onModalEsc);
  };

  const onModalEsc = (e) => {
    if (e.key === 'Escape') closePetModal();
  };

  // Add pet button -> open modal
  if (addPetBtn && petModal) {
    addPetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openPetModal('add', null);
    });

    // Close buttons
    modalCloseBtns.forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault();
      closePetModal();
    }));

    // Click backdrop closes (only if clicked outside panel)
    petModal.addEventListener('click', (e) => {
      if (e.target === petModal) closePetModal();
    });

    // Ensure hidden on load
    petModal.style.display = 'none';
    petModal.setAttribute('aria-hidden', 'true');
  }

  // Submit button (currently just local feedback; hook to API when you have it)
  if (pSubmit) {
    pSubmit.addEventListener('click', async (e) => {
      e.preventDefault();

      // Basic validation
      const name = (pName?.value || '').trim();
      if (!name) {
        showToast('Please enter pet name.');
        pName?.focus();
        return;
      }

      const payload = {
        name,
        species: (pSpecies?.value || '').trim(),
        breed: (pBreed?.value || '').trim(),
        sex: (pSex?.value || '').trim(),
        age: pAge?.value ? Number(pAge.value) : null,
        breedingAllowed: !!pBreeding?.checked,
        notes: (pNotes?.value || '').trim()
      };

      // Backend save
      if (modalMode !== 'add') {
        showToast('Edit is not wired yet.');
        return;
      }

      pSubmit.disabled = true;
      pSubmit.textContent = 'Saving…';

      const { ok, body } = await fetchJSON(API_ADD_PET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      pSubmit.disabled = false;
      pSubmit.textContent = 'Save';

      if (!ok || !body || body.success === false) {
        showToast(body?.message || 'Failed to save pet.');
        return;
      }

      // Update UI from saved data
      const savedPet = body.pet || body.data || null;
      if (savedPet) {
        PETS.unshift(savedPet);
      } else {
        // fallback: re-fetch
        const refreshed = await fetchJSON(API_MY_PETS, { method: 'GET' });
        PETS = Array.isArray(refreshed?.body?.pets) ? refreshed.body.pets : PETS;
      }

      closePetModal();
      showToast('Pet saved!');

      syncFilters();
      renderPets();
    });
  }

  // -------------------------------
  // Filters events
  // -------------------------------
  if (searchBox) {
    searchBox.addEventListener('input', e => {
      search = e.target.value || '';
      renderPets();
    });
  }
  if (filterSpecies) {
    filterSpecies.addEventListener('change', renderPets);
  }
  if (filterSex) {
    filterSex.addEventListener('change', renderPets);
  }
  if (onlyBreedable) {
    onlyBreedable.addEventListener('change', renderPets);
  }

  // Init
  (async function bootstrap() {
    petsGrid.innerHTML = '<p class="muted">Loading your pets…</p>';

    const { ok, body } = await fetchJSON(API_MY_PETS, { method: 'GET' });

    if (!ok || !body || body.success === false) {
      petsGrid.innerHTML =
        `<p class="error">Failed to load pets. ${esc(body?.message || 'Please refresh the page.')}</p>`;
      if (petsSummary) petsSummary.innerHTML = '';
      return;
    }

    PETS = Array.isArray(body.pets) ? body.pets : [];
    syncFilters();
    renderPets();
  })();
})();
