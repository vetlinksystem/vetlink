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
  const API_PET_BY_ID = (id) => `/client/pets/${encodeURIComponent(id)}`;

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
  const pBreed    = document.getElementById('pBreed');
  const pSex      = document.getElementById('pSex');
  const pSize     = document.getElementById('pSize');
  const pWeight   = document.getElementById('pWeight');
  const pAgeMonths= document.getElementById('pAgeMonths');
  const pAgeUnit  = document.getElementById('pAgeUnit');
  const pBreeding = document.getElementById('pBreeding');
  const pDescription = document.getElementById('pDescription');

  // Breeding sub-form (revealed only when breeding is enabled)
  const pBreedingBox      = document.getElementById('pBreedingBox');
  const pBreedingType     = document.getElementById('pBreedingType');
  const pCrossbreedFields = document.getElementById('pCrossbreedFields');
  const pBreedingPurpose  = document.getElementById('pBreedingPurpose');
  const pPreferredSize    = document.getElementById('pPreferredSize');
  const pBreedingAgeNote  = document.getElementById('pBreedingAgeNote');

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

  // ----- Pet photo upload (client-only) -----
  let pendingPhotoId = null;
  const photoInput = document.createElement('input');
  photoInput.type = 'file';
  photoInput.accept = 'image/*';
  photoInput.style.display = 'none';
  document.body.appendChild(photoInput);

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files && photoInput.files[0];
    const petId = pendingPhotoId;
    photoInput.value = '';
    pendingPhotoId = null;
    if (!file || !petId) return;

    showToast('Uploading photo…');
    const fd = new FormData();
    fd.append('image', file);

    const { ok, body } = await fetchJSON(
      `/client/pets/${encodeURIComponent(petId)}/image`,
      { method: 'POST', body: fd },
      30000
    );

    if (ok && body && body.success && body.imageUrl) {
      const pet = PETS.find(p => String(p.id) === String(petId));
      if (pet) pet.imageUrl = body.imageUrl;
      renderPets();
      showToast('Photo updated!');
    } else {
      showToast(body?.message || 'Upload failed.');
    }
  });

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

  // Breeds come from the server catalog (/catalogs/pet-options), which also knows each
  // breed's species and size class. Species is no longer asked for on this form — the
  // server derives it from the breed — so the breed list is no longer filtered by it.
  let BREED_LIST = [];
  let BREEDING_AGE = { female: { min: 18, max: 24 }, male: { min: 12, max: 15 } };

  const pBreedOther     = document.getElementById('pBreedOther');
  const pBreedOtherWrap = document.getElementById('pBreedOtherWrap');

  const toggleOtherBreed = () => {
    if (!pBreedOtherWrap) return;
    const isOther = String(pBreed?.value || '') === 'Other';
    pBreedOtherWrap.style.display = isOther ? '' : 'none';
    if (!isOther && pBreedOther) pBreedOther.value = '';
  };

  const setBreedOptions = () => {
    if (!pBreed) return;

    // Include any breed already saved on the owner's pets, so uncommon entries survive.
    const existing = distinct(PETS.map(p => p.breed).filter(Boolean));
    const breeds = distinct([...BREED_LIST, ...existing]);

    const current = String(pBreed.value || '');
    pBreed.innerHTML = `<option value="">Select breed…</option>` +
      breeds.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('') +
      `<option value="Other">Other</option>`;

    if (current && [...pBreed.options].some(o => o.value === current)) {
      pBreed.value = current;
    } else {
      pBreed.value = '';
    }

    toggleOtherBreed();
  };

  const loadPetOptions = async () => {
    const { ok, body } = await fetchJSON('/catalogs/pet-options', { method: 'GET' });
    if (ok && body && body.success !== false) {
      if (Array.isArray(body.breeds)) BREED_LIST = body.breeds;
      if (body.breedingAge) BREEDING_AGE = body.breedingAge;
    }
    setBreedOptions();
  };

  // ===== Breeding sub-form =====

  /** Age entered on the form, expressed in months. */
  const enteredAgeMonths = () => {
    const raw = Number(pAgeMonths?.value);
    if (!Number.isFinite(raw) || raw < 0) return null;
    return (pAgeUnit?.value === 'years') ? Math.round(raw * 12) : Math.round(raw);
  };

  const fmtAge = (months) => {
    if (months === null) return '';
    const y = Math.floor(months / 12), m = months % 12;
    if (y && m) return `${y} yr${y > 1 ? 's' : ''} ${m} mo${m > 1 ? 's' : ''}`;
    if (y) return `${y} yr${y > 1 ? 's' : ''}`;
    return `${m} mo${m === 1 ? '' : 's'}`;
  };

  /**
   * Ideal breeding age: Female 18–24 months, Male 12–15 months.
   * Too young is a hard block; past the window is a warning the vet will review.
   */
  const breedingAgeState = () => {
    const sex = String(pSex?.value || '').toLowerCase();
    const win = BREEDING_AGE[sex];
    const months = enteredAgeMonths();
    if (!win) return { level: 'info', message: "Select the pet's sex to check the ideal breeding age." };
    if (months === null) return { level: 'info', message: "Enter the pet's age to check the ideal breeding age." };
    if (months < win.min) {
      return { level: 'error',
        message: `Too young for breeding — ${fmtAge(months)} old. The ideal breeding age for a ${sex} is ${win.min}–${win.max} months.` };
    }
    if (months > win.max) {
      return { level: 'warn',
        message: `Past the ideal breeding age for a ${sex} (${win.min}–${win.max} months). A veterinarian will review this pairing.` };
    }
    return { level: 'ok', message: `Within the ideal breeding age for a ${sex} (${win.min}–${win.max} months).` };
  };

  const syncBreedingBox = () => {
    if (!pBreedingBox) return;
    const on = !!pBreeding?.checked;
    pBreedingBox.style.display = on ? '' : 'none';

    if (pCrossbreedFields) {
      pCrossbreedFields.style.display =
        (on && pBreedingType?.value === 'crossbreed') ? '' : 'none';
    }

    if (pBreedingAgeNote) {
      if (!on) {
        pBreedingAgeNote.textContent = '';
        pBreedingAgeNote.className = 'breeding-note';
      } else {
        const st = breedingAgeState();
        pBreedingAgeNote.textContent = st.message;
        pBreedingAgeNote.className = `breeding-note ${st.level}`;
      }
    }
  };

  pBreeding?.addEventListener('change', syncBreedingBox);
  pBreedingType?.addEventListener('change', syncBreedingBox);
  pSex?.addEventListener('change', syncBreedingBox);
  pAgeMonths?.addEventListener('input', syncBreedingBox);
  pAgeUnit?.addEventListener('change', syncBreedingBox);

  // ===== Display helpers =====

  /** Age is stored in months now; older documents only have whole years. */
  const petAgeText = (p) => {
    const m = (typeof p.ageMonths === 'number')
      ? p.ageMonths
      : (typeof p.age === 'number' ? p.age * 12 : null);
    if (m === null) return '';
    const y = Math.floor(m / 12), mo = m % 12;
    if (y && mo) return `${y} yr${y > 1 ? 's' : ''} ${mo} mo${mo > 1 ? 's' : ''}`;
    if (y) return `${y} yr${y > 1 ? 's' : ''}`;
    return `${mo} mo${mo === 1 ? '' : 's'}`;
  };

  const sizeText = (p) => {
    const s = String(p.size || '').toLowerCase();
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const breedingTypeText = (p) => {
    const t = String(p.breedingType || '').toLowerCase();
    if (t === 'purebred') return 'Purebred';
    if (t === 'crossbreed') {
      const purpose = String(p.breedingPurpose || '');
      return purpose ? `Crossbreed (${purpose})` : 'Crossbreed';
    }
    return 'Not set';
  };

  const buildCard = (p) => `
    <article class="pet-card" data-pet-id="${esc(p.id)}">
      <header class="pet-header">
        <div class="pet-avatar" aria-hidden="true">
          ${p.imageUrl
            ? `<img src="${esc(p.imageUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit"/>`
            : `<span>${esc((p.name || 'P').charAt(0).toUpperCase())}</span>`}
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
          <dd>${esc(petAgeText(p) || '—')}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>${esc(sizeText(p) || '—')}</dd>
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
            <div class="detail-value">${esc(petAgeText(p) || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Size</div>
            <div class="detail-value">${esc(sizeText(p) || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Weight</div>
            <div class="detail-value">${p.weight ? esc(p.weight + ' kg') : '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Breeding</div>
            <div class="detail-value">
              ${p.breedingAllowed
                ? '<span class="badge ok">Allowed</span>'
                : '<span class="badge no">Not allowed</span>'}
            </div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Breeding Type</div>
            <div class="detail-value">${p.breedingAllowed ? esc(breedingTypeText(p)) : '—'}</div>
          </div>
          <div class="detail-item span-2">
            <div class="detail-label">Description</div>
            <div class="detail-value">${(p.description || p.notes) ? esc(p.description || p.notes) : '—'}</div>
          </div>
        </div>
      </section>

      <footer class="pet-actions">
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button type="button" class="btn js-edit" data-edit="${esc(p.id)}">Edit</button>
          <button type="button" class="btn secondary js-photo" data-photo="${esc(p.id)}">${p.imageUrl ? 'Change photo' : 'Add photo'}</button>
          <button type="button" class="btn secondary js-delete" data-del="${esc(p.id)}">Delete</button>
        </div>
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
    const editBtn = e.target.closest('.js-edit');
    if (editBtn) {
      e.preventDefault();
      const id = editBtn.getAttribute('data-edit');
      const pet = PETS.find(p => String(p.id) === String(id));
      openPetModal('edit', pet || null);
      return;
    }

    const photoBtn = e.target.closest('.js-photo');
    if (photoBtn) {
      e.preventDefault();
      pendingPhotoId = photoBtn.getAttribute('data-photo');
      photoInput.click();
      return;
    }

    const delBtn = e.target.closest('.js-delete');
    if (delBtn) {
      e.preventDefault();
      const id = delBtn.getAttribute('data-del');
      const pet = PETS.find(p => String(p.id) === String(id));
      const ok = confirm(`Delete ${pet?.name || 'this pet'}?`);
      if (!ok) return;
      (async () => {
        const { ok: httpOk, body } = await fetchJSON(API_PET_BY_ID(id), { method:'DELETE' });
        if (!httpOk || body?.success === false) {
          showToast(body?.message || 'Failed to delete pet.');
          return;
        }
        PETS = PETS.filter(p => String(p.id) !== String(id));
        syncFilters();
        renderPets();
        showToast('Pet deleted.');
      })();
      return;
    }

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
    setBreedOptions();
    if (pBreed) {
      const b = String(pet?.breed || '');
      const has = [...pBreed.options].some(o => o.value === b);
      if (b && !has) {
        pBreed.value = 'Other';
        if (pBreedOther) pBreedOther.value = b;
      } else {
        pBreed.value = b || '';
        if (pBreedOther) pBreedOther.value = '';
      }
      toggleOtherBreed();
    }
    if (pSex) pSex.value = pet?.sex || '';
    if (pSize) pSize.value = String(pet?.size || '').toLowerCase();
    if (pWeight) pWeight.value = (pet?.weight ?? '') === null ? '' : (pet?.weight ?? '');

    // Age is stored in months; fall back to the legacy whole-years field.
    if (pAgeMonths && pAgeUnit) {
      if (typeof pet?.ageMonths === 'number') {
        pAgeMonths.value = pet.ageMonths;
        pAgeUnit.value = 'months';
      } else if (typeof pet?.age === 'number') {
        pAgeMonths.value = pet.age;
        pAgeUnit.value = 'years';
      } else {
        pAgeMonths.value = '';
        pAgeUnit.value = 'months';
      }
    }

    if (pBreeding) pBreeding.checked = !!pet?.breedingAllowed;
    if (pBreedingType) pBreedingType.value = String(pet?.breedingType || '');
    if (pBreedingPurpose) pBreedingPurpose.value = String(pet?.breedingPurpose || '');
    if (pPreferredSize) pPreferredSize.value = String(pet?.preferredSize || '');
    // "notes" is the legacy name of this field on older pet documents.
    if (pDescription) pDescription.value = pet?.description || pet?.notes || '';
    syncBreedingBox();

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

  // When breed changes, toggle the custom breed field
  if (pBreed) {
    pBreed.addEventListener('change', toggleOtherBreed);
  }

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
      let breed = (pBreed?.value || '').trim();
      if (breed === 'Other') {
        breed = (pBreedOther?.value || '').trim();
        if (!breed) {
          showToast('Please specify the breed.');
          pBreedOther?.focus();
          return;
        }
      }
      if (!breed) {
        showToast('Please select the breed.');
        pBreed?.focus();
        return;
      }

      // Sex is no longer optional.
      const sex = (pSex?.value || '').trim();
      if (!sex) {
        showToast("Please select the pet's sex.");
        pSex?.focus();
        return;
      }

      const size = (pSize?.value || '').trim();
      if (!size) {
        showToast("Please select the pet's size.");
        pSize?.focus();
        return;
      }

      const weight = Number(pWeight?.value);
      if (!Number.isFinite(weight) || weight <= 0) {
        showToast("Please enter the pet's weight in kilograms.");
        pWeight?.focus();
        return;
      }

      const ageMonths = enteredAgeMonths();
      if (ageMonths === null) {
        showToast("Please enter the pet's age.");
        pAgeMonths?.focus();
        return;
      }

      // Description replaced the old optional "notes" field and is required.
      const description = (pDescription?.value || '').trim();
      if (!description) {
        showToast('Please describe your pet.');
        pDescription?.focus();
        return;
      }

      const breedingAllowed = !!pBreeding?.checked;
      const breedingType = (pBreedingType?.value || '').trim();

      if (breedingAllowed) {
        if (!breedingType) {
          showToast('Choose a breeding type: Purebred or Crossbreed.');
          pBreedingType?.focus();
          return;
        }
        if (breedingType === 'crossbreed' && !(pBreedingPurpose?.value || '').trim()) {
          showToast('Choose the purpose of breeding.');
          pBreedingPurpose?.focus();
          return;
        }
        // Ideal breeding age: Female 18–24 months, Male 12–15 months.
        const ageState = breedingAgeState();
        if (ageState.level === 'error') {
          showToast(ageState.message);
          pAgeMonths?.focus();
          return;
        }
      }

      const payload = {
        name,
        breed,          // species is derived from this server-side
        sex,
        size,
        weight,
        ageMonths,
        description,
        breedingAllowed,
        breedingType: breedingAllowed ? breedingType : '',
        breedingPurpose: breedingAllowed ? (pBreedingPurpose?.value || '').trim() : '',
        preferredSize: breedingAllowed ? (pPreferredSize?.value || '').trim() : ''
      };

      const isEdit = modalMode === 'edit' && editingPetId;

      pSubmit.disabled = true;
      pSubmit.textContent = 'Saving…';

      const { ok, body } = await fetchJSON(isEdit ? API_PET_BY_ID(editingPetId) : API_ADD_PET, {
        method: isEdit ? 'PUT' : 'POST',
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
        if (isEdit) {
          PETS = PETS.map(p => (String(p.id) === String(savedPet.id) ? savedPet : p));
        } else {
          PETS.unshift(savedPet);
        }
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

    // Breed list (and the ideal breeding-age windows) come from the server catalog.
    await loadPetOptions();
  })();
})();
