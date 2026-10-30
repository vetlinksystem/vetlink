/* ===========================================================
   EMPLOYEE — MEDICAL RECORDS
   -----------------------------------------------------------
   Roles (enforced server-side, mirrored here so we don't draw
   buttons that would 403):
     Veterinarian / Admin — add records          (records.manage)
     Staff                — view and print only  (records.view/print)

   APIs:
     GET  /employee/records/all
     GET  /employee/pets/register
     GET  /catalogs/medical
     POST /employee/pets/:id/records   (multipart)
   =========================================================== */
(function () {
  const API_RECORDS = '/employee/records/all';
  const API_PETS    = '/employee/pets/register';
  const API_MEDICAL = '/catalogs/medical';
  const API_ADD     = (petId) => `/employee/pets/${encodeURIComponent(petId)}/records`;

  const $ = (id) => document.getElementById(id);

  const tableBody   = $('rxTableBody');
  const summaryEl   = $('rxSummary');
  const searchBox   = $('rxSearch');
  const typeFilter  = $('rxTypeFilter');
  const fromInput   = $('rxFrom');
  const toInput     = $('rxTo');
  const clearBtn    = $('rxClearBtn');
  const printBtn    = $('rxPrintBtn');
  const addBtn      = $('rxAddBtn');
  const roleNote    = $('rxRoleNote');

  const modal       = $('rxAddModal');
  const form        = $('rxForm');
  const petSelect   = $('rxPet');
  const typeSelect  = $('rxType');
  const dateInput   = $('rxDate');
  const vetInput    = $('rxVet');
  const typeFields  = $('rxTypeFields');
  const notesInput  = $('rxNotes');
  const fileInput   = $('rxFile');
  const saveBtn     = $('rxSaveBtn');
  const printArea   = $('rxPrintArea');
  const toastEl     = $('rxToast');

  if (!tableBody) return;

  let RECORDS = [];
  let PETS = [];
  let CATALOG = null;
  let expandedId = null;

  const can = (p) => !!(window.vetlinkCan && window.vetlinkCan(p));
  const canManage = () => can('records.manage');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const toast = (msg) => {
    if (!toastEl) { vetlinkDialog.alert(msg); return; }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2400);
  };

  const fetchJSON = async (url, options = {}, timeoutMs = 20000) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const isForm = options.body instanceof FormData;
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json', ...(isForm ? {} : { 'Content-Type': 'application/json' }) },
        signal: ctl.signal,
        ...options
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

  const titleCase = (s) => String(s || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // ===== Table =====

  const rowHTML = (r) => `
    <tr data-record="${esc(r.id)}">
      <td><strong>${esc(r.id)}</strong></td>
      <td>${esc(fmtDate(r.date))}</td>
      <td>${esc(r.petName)}${r.petBreed ? `<br><small>${esc(r.petBreed)}</small>` : ''}</td>
      <td>${esc(r.ownerName || '—')}</td>
      <td><span class="rx-type-badge ${esc(r.recordType)}">${esc(r.type)}</span></td>
      <td>${esc(r.veterinarian || '—')}</td>
      <td class="rx-no-print" style="white-space:nowrap">
        <button type="button" class="btn-xs primary js-rx-view" data-id="${esc(r.id)}">
          ${expandedId === r.id ? 'Hide' : 'View'}
        </button>
        <button type="button" class="btn-xs link js-rx-print" data-id="${esc(r.id)}">Print</button>
        ${r.url ? `<a class="btn-xs link" href="${esc(r.url)}" target="_blank" rel="noopener">File</a>` : ''}
      </td>
    </tr>
    ${expandedId === r.id ? detailRowHTML(r) : ''}
  `;

  /** Flatten a details block into label/value pairs for display. */
  const detailPairs = (r) => {
    const d = r.details || {};
    const pairs = [];
    const push = (label, value) => {
      if (value === null || value === undefined || value === '') return;
      if (Array.isArray(value)) {
        if (!value.length) return;
        pairs.push([label, value.join(', ')]);
        return;
      }
      pairs.push([label, String(value)]);
    };

    switch (r.recordType) {
      case 'grooming':
        push('Grooming services', d.groomingTypes);
        push('Service details', d.serviceDetails);
        push('Products used', d.productsUsed);
        push('Next appointment', d.nextAppointment);
        break;
      case 'vaccination':
        push('Vaccine name', d.vaccineName);
        push('Vaccine type', d.vaccineType);
        push('Manufacturer', d.manufacturer);
        push('Batch / Lot no.', d.batchNo);
        push('Route', d.route);
        push('Site of injection', d.siteOfInjection);
        push('Date given', d.dateGiven);
        push('Next due date', d.nextDueDate);
        break;
      case 'checkup':
        push('Reason for visit', d.reasonForVisit);
        push('Body weight (kg)', d.bodyWeight);
        push('Temperature (°C)', d.temperature);
        push('Heart rate (bpm)', d.heartRate);
        push('Findings / diagnosis', d.findings);
        push('Treatment / recommendation', d.treatment);
        break;
      case 'general_checkup':
        push('Body condition', d.bodyCondition);
        push('Hydration status', d.hydrationStatus);
        Object.entries(d.screening || {}).forEach(([area, result]) => push(area, result));
        push('Others', d.others);
        push('Overall assessment', d.overallAssessment);
        break;
      case 'surgery':
        push('Surgery / procedure', d.procedure);
        push('Anaesthesia', d.anesthesiaTypes);
        push('Surgeon', d.surgeon);
        push('Assistant', d.assistant);
        push('Start time', d.startTime);
        push('End time', d.endTime);
        push('Pre-operative diagnosis', d.preOperativeDiagnosis);
        push('Post-operative diagnosis', d.postOperativeDiagnosis);
        push('Outcome', d.outcome);
        push('Medications given', d.medicationsGiven);
        break;
      default:
        break;
    }
    return pairs;
  };

  const detailRowHTML = (r) => {
    const pairs = detailPairs(r);
    const grid = pairs.length
      ? `<div class="rx-detail-grid">${pairs.map(([k, v]) => `
          <div class="rx-detail-item">
            <span class="rx-detail-label">${esc(k)}</span>
            <span class="rx-detail-value">${esc(v)}</span>
          </div>`).join('')}</div>`
      : '<em>No structured details on this record.</em>';

    return `
      <tr class="rx-detail-row">
        <td colspan="7">
          ${grid}
          ${r.notes ? `<div class="rx-detail-notes"><strong>Notes:</strong> ${esc(r.notes)}</div>` : ''}
          ${r.createdByName ? `<div class="rx-detail-notes"><small>Recorded by ${esc(r.createdByName)}${r.createdByRole ? ` (${esc(titleCase(r.createdByRole))})` : ''}</small></div>` : ''}
        </td>
      </tr>
    `;
  };

  const renderSummary = () => {
    if (!summaryEl) return;
    const byType = RECORDS.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    summaryEl.innerHTML =
      `<span class="rx-chip"><strong>${RECORDS.length}</strong> records</span>` +
      Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `<span class="rx-chip"><strong>${n}</strong> ${esc(t)}</span>`)
        .join('');
  };

  const render = () => {
    if (!RECORDS.length) {
      tableBody.innerHTML = '<tr><td colspan="7" class="rx-muted">No records found.</td></tr>';
      renderSummary();
      return;
    }
    tableBody.innerHTML = RECORDS.map(rowHTML).join('');
    renderSummary();
  };

  // ===== Load =====

  const currentFilters = () => {
    const params = new URLSearchParams();
    if (searchBox?.value.trim()) params.set('q', searchBox.value.trim());
    if (typeFilter?.value) params.set('recordType', typeFilter.value);
    if (fromInput?.value) params.set('from', fromInput.value);
    if (toInput?.value) params.set('to', toInput.value);
    return params.toString();
  };

  const loadRecords = async () => {
    tableBody.innerHTML = '<tr><td colspan="7" class="rx-muted">Loading…</td></tr>';
    const qs = currentFilters();
    const { ok, status, body } = await fetchJSON(`${API_RECORDS}${qs ? `?${qs}` : ''}`);

    if (!ok) {
      const msg = status === 403
        ? (body?.message || 'Your role is not allowed to view medical records.')
        : 'Failed to load medical records.';
      tableBody.innerHTML = `<tr><td colspan="7" class="rx-muted">${esc(msg)}</td></tr>`;
      return;
    }

    RECORDS = Array.isArray(body.records) ? body.records : [];
    render();
  };

  const loadPets = async () => {
    const { ok, body } = await fetchJSON(API_PETS);
    if (!ok) return;
    PETS = Array.isArray(body.pets) ? body.pets : [];
    if (petSelect) {
      petSelect.innerHTML = '<option value="">Select pet…</option>' +
        PETS.map(p => `<option value="${esc(p.id)}">${esc(p.name)}${p.ownerName ? ` — ${esc(p.ownerName)}` : ''}${p.breed ? ` (${esc(p.breed)})` : ''}</option>`).join('');
    }
  };

  const loadCatalog = async () => {
    const { ok, body } = await fetchJSON(API_MEDICAL);
    if (!ok || !body || body.success === false) return;
    CATALOG = body;

    const types = Array.isArray(body.recordTypes) ? body.recordTypes : [];
    if (typeFilter) {
      typeFilter.innerHTML = '<option value="">All types</option>' +
        types.map(t => `<option value="${esc(t.key)}">${esc(t.label)}</option>`).join('');
    }
    if (typeSelect) {
      typeSelect.innerHTML = '<option value="">Select type…</option>' +
        types.map(t => `<option value="${esc(t.key)}">${esc(t.label)}</option>`).join('');
    }
  };

  // ===== Type-specific form builder (shared with the Pet Details page) =====

  const buildTypeFields = (recordType) => {
    if (!typeFields) return;
    typeFields.innerHTML = window.vetlinkRecordFields.build(recordType, CATALOG);
  };

  typeSelect?.addEventListener('change', () => buildTypeFields(typeSelect.value));

  // ===== Modal =====

  const openModal = () => {
    if (!canManage()) {
      toast('Only a veterinarian can add medical records.');
      return;
    }
    form.reset();
    typeFields.innerHTML = '';
    dateInput.value = new Date().toISOString().slice(0, 10);
    vetInput.value = window.VETLINK_EMPLOYEE?.name || '';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  };

  const closeModal = () => {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  };

  addBtn?.addEventListener('click', openModal);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-rx-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const petId = petSelect.value;
    if (!petId) { toast('Please select a pet.'); return; }
    if (!typeSelect.value) { toast('Please select a record type.'); return; }

    const fd = new FormData();
    fd.append('recordType', typeSelect.value);
    fd.append('date', dateInput.value);
    fd.append('veterinarian', vetInput.value.trim());
    fd.append('notes', notesInput.value.trim());

    window.vetlinkRecordFields.appendTo(fd, typeFields);

    if (fileInput.files && fileInput.files[0]) fd.append('file', fileInput.files[0]);

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const { ok, body } = await fetchJSON(API_ADD(petId), { method: 'POST', body: fd });

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Record';

    if (!ok || body?.success === false) {
      toast(body?.message || 'Failed to save the record.');
      return;
    }

    closeModal();
    toast('Record saved.');
    loadRecords();
  });

  // ===== Print =====

  const printHeader = (subtitle) => `
    <div class="rx-print-header">
      <div class="rx-print-clinic">Doc Ben'z<small>Veterinary Management System</small></div>
      <div class="rx-print-meta">
        ${esc(subtitle)}<br>
        Printed: ${esc(new Date().toLocaleString('en-PH'))}<br>
        By: ${esc(window.VETLINK_EMPLOYEE?.name || '—')}${window.VETLINK_ROLE_LABEL ? ` (${esc(window.VETLINK_ROLE_LABEL)})` : ''}
      </div>
    </div>`;

  const printFooter = () => `
    <div class="rx-print-footer">
      This document contains confidential veterinary information and is released in
      accordance with the Data Privacy Act of 2012 (RA 10173).
    </div>`;

  /** Full one-record sheet — the format staff hand to an owner. */
  const buildSingleSheet = (r) => {
    const pet = PETS.find(p => String(p.id) === String(r.petId));
    const pairs = detailPairs(r);

    printArea.innerHTML = `
      ${printHeader('Medical Record')}
      <h2 class="rx-print-title">${esc(r.type)} — ${esc(r.petName)}</h2>

      <div class="rx-print-block">
        <h3>Patient</h3>
        <div class="rx-print-kv">
          <div><b>Pet name</b> ${esc(r.petName)}</div>
          <div><b>Record ID</b> ${esc(r.id)}</div>
          <div><b>Breed</b> ${esc(pet?.breed || r.petBreed || '—')}</div>
          <div><b>Species</b> ${esc(pet?.species || r.petSpecies || '—')}</div>
          <div><b>Sex</b> ${esc(pet?.sex || '—')}</div>
          <div><b>Age</b> ${esc(pet?.ageText || '—')}</div>
          <div><b>Weight</b> ${esc(pet?.weight ? pet.weight + ' kg' : '—')}</div>
          <div><b>Size</b> ${esc(titleCase(pet?.size) || '—')}</div>
          <div><b>Owner</b> ${esc(r.ownerName || '—')}</div>
          <div><b>Contact</b> ${esc(r.ownerNumber || '—')}</div>
        </div>
      </div>

      <div class="rx-print-block">
        <h3>Visit</h3>
        <div class="rx-print-kv">
          <div><b>Date</b> ${esc(fmtDate(r.date))}</div>
          <div><b>Record type</b> ${esc(r.type)}</div>
          <div><b>Veterinarian</b> ${esc(r.veterinarian || '—')}</div>
          <div><b>Recorded by</b> ${esc(r.createdByName || '—')}</div>
        </div>
      </div>

      ${pairs.length ? `
      <div class="rx-print-block">
        <h3>Clinical details</h3>
        <div class="rx-print-kv">
          ${pairs.map(([k, v]) => `<div><b>${esc(k)}</b> ${esc(v)}</div>`).join('')}
        </div>
      </div>` : ''}

      <div class="rx-print-block">
        <h3>Notes</h3>
        <div class="rx-print-notes">${esc(r.notes || '—')}</div>
      </div>

      <div class="rx-print-sign">
        <div>Attending Veterinarian</div>
        <div>Owner / Representative</div>
      </div>

      ${printFooter()}
    `;
    window.print();
  };

  /** Summary sheet for the whole filtered list. */
  const buildListSheet = () => {
    const filterBits = [];
    if (searchBox?.value.trim()) filterBits.push(`search: "${searchBox.value.trim()}"`);
    if (typeFilter?.value) filterBits.push(`type: ${typeFilter.options[typeFilter.selectedIndex].text}`);
    if (fromInput?.value) filterBits.push(`from ${fromInput.value}`);
    if (toInput?.value) filterBits.push(`to ${toInput.value}`);

    printArea.innerHTML = `
      ${printHeader('Medical Records Report')}
      <h2 class="rx-print-title">Medical Records — ${RECORDS.length} record${RECORDS.length === 1 ? '' : 's'}</h2>
      ${filterBits.length ? `<p style="font-size:9.5pt">Filters — ${esc(filterBits.join(' · '))}</p>` : ''}

      <table class="rx-print-table">
        <thead>
          <tr>
            <th>Record</th><th>Date</th><th>Pet</th><th>Owner</th>
            <th>Type</th><th>Veterinarian</th><th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${RECORDS.map(r => `
            <tr>
              <td>${esc(r.id)}</td>
              <td>${esc(fmtDate(r.date))}</td>
              <td>${esc(r.petName)}</td>
              <td>${esc(r.ownerName || '—')}</td>
              <td>${esc(r.type)}</td>
              <td>${esc(r.veterinarian || '—')}</td>
              <td>${esc(r.notes || '')}</td>
            </tr>`).join('')}
        </tbody>
      </table>

      <div class="rx-print-sign">
        <div>Prepared by</div>
        <div>Received by</div>
      </div>

      ${printFooter()}
    `;
    window.print();
  };

  printBtn?.addEventListener('click', () => {
    if (!RECORDS.length) { toast('There is nothing to print.'); return; }
    buildListSheet();
  });

  // ===== Row actions =====

  tableBody.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.js-rx-view');
    if (viewBtn) {
      const id = viewBtn.getAttribute('data-id');
      expandedId = expandedId === id ? null : id;
      render();
      return;
    }

    const printRowBtn = e.target.closest('.js-rx-print');
    if (printRowBtn) {
      const id = printRowBtn.getAttribute('data-id');
      const r = RECORDS.find(x => String(x.id) === String(id));
      if (r) buildSingleSheet(r);
    }
  });

  // ===== Filters =====

  let searchTimer = null;
  searchBox?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadRecords, 300);
  });
  [typeFilter, fromInput, toInput].forEach(el => el?.addEventListener('change', loadRecords));
  clearBtn?.addEventListener('click', () => {
    if (searchBox) searchBox.value = '';
    if (typeFilter) typeFilter.value = '';
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
    loadRecords();
  });

  // core.js resolves the role asynchronously — reflect it once it lands.
  document.addEventListener('vetlink:role-ready', () => {
    if (roleNote) {
      roleNote.textContent = canManage()
        ? 'You can add and edit medical records.'
        : 'View and print only — records can only be added or edited by a veterinarian.';
    }
    if (RECORDS.length) render();
  });

  // ===== Init =====
  (async function bootstrap() {
    await Promise.all([loadCatalog(), loadPets()]);
    await loadRecords();
  })();
})();
