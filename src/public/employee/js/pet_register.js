/* ===========================================================
   EMPLOYEE — PET RECORDS (clinic-wide pet register)
   -----------------------------------------------------------
   "Pet Records containing records of all pets" — lets staff and
   vets look a pet up directly instead of going via its owner.

   API: GET /employee/pets/register?q=&species=&sex=&breedingOnly=
   =========================================================== */
(function () {
  const API_REGISTER = '/employee/pets/register';

  const $ = (id) => document.getElementById(id);

  const tableBody   = $('prTableBody');
  const summaryEl   = $('prSummary');
  const searchBox   = $('prSearch');
  const speciesSel  = $('prSpecies');
  const sexSel      = $('prSex');
  const breedingOnly= $('prBreedingOnly');
  const clearBtn    = $('prClearBtn');
  const printBtn    = $('prPrintBtn');
  const printArea   = $('prPrintArea');
  const toastEl     = $('prToast');

  if (!tableBody) return;

  let PETS = [];
  let SUMMARY = {};
  let speciesFilled = false;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const toast = (msg) => {
    if (!toastEl) { alert(msg); return; }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2400);
  };

  const fetchJSON = async (url, timeoutMs = 20000) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
        signal: ctl.signal
      });
      clearTimeout(t);
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body };
    } catch (err) {
      clearTimeout(t);
      return { ok: false, status: 0, body: { message: err.message } };
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(String(iso) + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const titleCase = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());

  const breedingCell = (p) => {
    if (!p.breedingAllowed) return '<span class="rx-type-badge">Not available</span>';
    const type = p.breedingType ? titleCase(p.breedingType) : 'Available';
    return `<span class="rx-type-badge checkup">${esc(type)}</span>`;
  };

  const rowHTML = (p) => `
    <tr>
      <td><strong>${esc(p.id)}</strong></td>
      <td><a href="/employee/pet?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></td>
      <td>${esc(p.species || '—')}${p.breed ? `<br><small>${esc(p.breed)}</small>` : ''}</td>
      <td>${esc(p.sex || '—')}</td>
      <td>${esc(p.ageText || '—')}</td>
      <td>${esc(titleCase(p.size) || '—')}${p.weight ? `<br><small>${esc(p.weight)} kg</small>` : ''}</td>
      <td>${esc(p.ownerName || '—')}${p.ownerNumber ? `<br><small>${esc(p.ownerNumber)}</small>` : ''}</td>
      <td>${breedingCell(p)}</td>
      <td>${p.recordCount}${p.lastRecordDate ? `<br><small>${esc(fmtDate(p.lastRecordDate))}</small>` : ''}</td>
      <td>${esc(fmtDate(p.lastVisitDate))}</td>
      <td class="rx-no-print" style="white-space:nowrap">
        <a class="btn-xs link" href="/employee/pet?id=${encodeURIComponent(p.id)}">View</a>
        <a class="btn-xs primary" href="/employee/records?petId=${encodeURIComponent(p.id)}">Records</a>
      </td>
    </tr>
  `;

  const renderSummary = () => {
    if (!summaryEl) return;
    const bySpecies = SUMMARY.bySpecies || {};
    summaryEl.innerHTML =
      `<span class="rx-chip"><strong>${SUMMARY.total ?? PETS.length}</strong> pets</span>` +
      Object.entries(bySpecies)
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => `<span class="rx-chip"><strong>${n}</strong> ${esc(s)}</span>`)
        .join('') +
      `<span class="rx-chip"><strong>${SUMMARY.breedingAvailable ?? 0}</strong> breeding available</span>` +
      `<span class="rx-chip"><strong>${SUMMARY.withRecords ?? 0}</strong> with records</span>`;
  };

  const render = () => {
    if (!PETS.length) {
      tableBody.innerHTML = '<tr><td colspan="11" class="rx-muted">No pets found.</td></tr>';
      renderSummary();
      return;
    }
    tableBody.innerHTML = PETS.map(rowHTML).join('');
    renderSummary();
  };

  const load = async () => {
    tableBody.innerHTML = '<tr><td colspan="11" class="rx-muted">Loading…</td></tr>';

    const params = new URLSearchParams();
    if (searchBox?.value.trim()) params.set('q', searchBox.value.trim());
    if (speciesSel?.value) params.set('species', speciesSel.value);
    if (sexSel?.value) params.set('sex', sexSel.value);
    if (breedingOnly?.checked) params.set('breedingOnly', 'true');

    const qs = params.toString();
    const { ok, status, body } = await fetchJSON(`${API_REGISTER}${qs ? `?${qs}` : ''}`);

    if (!ok) {
      const msg = status === 403
        ? (body?.message || 'Your role is not allowed to view the pet register.')
        : 'Failed to load the pet register.';
      tableBody.innerHTML = `<tr><td colspan="11" class="rx-muted">${esc(msg)}</td></tr>`;
      return;
    }

    PETS = Array.isArray(body.pets) ? body.pets : [];
    SUMMARY = body.summary || {};

    // Fill the species dropdown once, from the unfiltered result.
    if (!speciesFilled && speciesSel) {
      const list = Object.keys(SUMMARY.bySpecies || {}).sort();
      if (list.length) {
        speciesSel.innerHTML = '<option value="">All species</option>' +
          list.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
        speciesFilled = true;
      }
    }

    render();
  };

  // ===== Print =====

  printBtn?.addEventListener('click', () => {
    if (!PETS.length) { toast('There is nothing to print.'); return; }

    const filterBits = [];
    if (searchBox?.value.trim()) filterBits.push(`search: "${searchBox.value.trim()}"`);
    if (speciesSel?.value) filterBits.push(`species: ${speciesSel.value}`);
    if (sexSel?.value) filterBits.push(`sex: ${sexSel.value}`);
    if (breedingOnly?.checked) filterBits.push('breeding available only');

    printArea.innerHTML = `
      <div class="rx-print-header">
        <div class="rx-print-clinic">Doc Ben'z<small>Veterinary Management System</small></div>
        <div class="rx-print-meta">
          Pet Register<br>
          Printed: ${esc(new Date().toLocaleString('en-PH'))}<br>
          By: ${esc(window.VETLINK_EMPLOYEE?.name || '—')}${window.VETLINK_ROLE_LABEL ? ` (${esc(window.VETLINK_ROLE_LABEL)})` : ''}
        </div>
      </div>

      <h2 class="rx-print-title">Pet Records — ${PETS.length} pet${PETS.length === 1 ? '' : 's'}</h2>
      ${filterBits.length ? `<p style="font-size:9.5pt">Filters — ${esc(filterBits.join(' · '))}</p>` : ''}

      <table class="rx-print-table">
        <thead>
          <tr>
            <th>Pet ID</th><th>Name</th><th>Species / Breed</th><th>Sex</th>
            <th>Age</th><th>Size</th><th>Weight</th><th>Owner</th>
            <th>Contact</th><th>Records</th><th>Last visit</th>
          </tr>
        </thead>
        <tbody>
          ${PETS.map(p => `
            <tr>
              <td>${esc(p.id)}</td>
              <td>${esc(p.name)}</td>
              <td>${esc(p.species || '—')}${p.breed ? ` / ${esc(p.breed)}` : ''}</td>
              <td>${esc(p.sex || '—')}</td>
              <td>${esc(p.ageText || '—')}</td>
              <td>${esc(titleCase(p.size) || '—')}</td>
              <td>${esc(p.weight ? p.weight + ' kg' : '—')}</td>
              <td>${esc(p.ownerName || '—')}</td>
              <td>${esc(p.ownerNumber || '—')}</td>
              <td>${esc(p.recordCount)}</td>
              <td>${esc(fmtDate(p.lastVisitDate))}</td>
            </tr>`).join('')}
        </tbody>
      </table>

      <div class="rx-print-sign">
        <div>Prepared by</div>
        <div>Received by</div>
      </div>

      <div class="rx-print-footer">
        This document contains confidential information and is released in accordance
        with the Data Privacy Act of 2012 (RA 10173).
      </div>
    `;
    window.print();
  });

  // ===== Filters =====

  let searchTimer = null;
  searchBox?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });
  [speciesSel, sexSel, breedingOnly].forEach(el => el?.addEventListener('change', load));
  clearBtn?.addEventListener('click', () => {
    if (searchBox) searchBox.value = '';
    if (speciesSel) speciesSel.value = '';
    if (sexSel) sexSel.value = '';
    if (breedingOnly) breedingOnly.checked = false;
    load();
  });

  // ===== Init =====
  load();
})();
