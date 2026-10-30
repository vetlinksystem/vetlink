const qs = new URLSearchParams(location.search);
const id = String(qs.get('id') || '').trim();
const el = document.getElementById('petInfo');
const recEl = document.getElementById('petRecords');

const fetchJSON = async (url, options = {}) => {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
      ...options
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
  } catch (e) {
    return { ok: false, body: { message: e.message } };
  }
};

const esc = (s) =>
  (s ?? '').toString().replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

const isImageUrl = (u) => /\.(jpe?g|png|webp|gif|heic)(\?|$)/i.test(u || '');

// ---------- Pet info + photo ----------
const renderPet = (p, owner) => {
  if (!p) {
    el.innerHTML = '<em>Pet not found.</em>';
    return;
  }

  const ownerId = p.ownerId || (owner && owner.id) || '';
  const ownerName = owner ? (owner.full_name || owner.name || 'Owner') : `Owner #${ownerId}`;
  const ownerLink = ownerId
    ? `<a href="/employee/user?id=${encodeURIComponent(ownerId)}">${esc(ownerName)}</a>`
    : esc(ownerName);

  const photo = p.imageUrl
    ? `<img class="pet-photo" src="${esc(p.imageUrl)}" alt="Pet photo"/>`
    : `<div class="pet-photo--none">No photo</div>`;

  // Photo is read-only here — only the client can upload/change their pet's photo.
  el.innerHTML = `
    <div style="display:flex;gap:1.25rem;flex-wrap:wrap;align-items:flex-start">
      <div id="petPhoto">${photo}</div>
      <div style="flex:1;min-width:220px">
        <p><strong>Pet ID:</strong> ${esc(p.id)}</p>
        <p><strong>Name:</strong> ${esc(p.name)}</p>
        <p><strong>Breed:</strong> ${esc(p.breed)}</p>
        <p><strong>Species:</strong> ${esc(p.species)}</p>
        <p><strong>Sex:</strong> ${esc(p.sex)}</p>
        <p><strong>Age:</strong> ${esc(p.age ?? '')}</p>
        <p><strong>Owner:</strong> ${ownerLink}</p>
      </div>
    </div>
  `;
};

// ---------- Records ----------
// Record types and their vocabularies come from the server (utilities/catalogs.js);
// the type-specific inputs are the same ones the Pet Records page uses (record_fields.js).
let CATALOG = null;

const loadCatalog = async () => {
  const { ok, body } = await fetchJSON('/catalogs/medical');
  if (ok && body && body.success !== false) CATALOG = body;
};

// The one detail that best identifies the record, shown under its type.
const PRIMARY_DETAIL = {
  vaccination: (d) => d.vaccineName,
  checkup: (d) => d.reasonForVisit,
  general_checkup: (d) => d.overallAssessment,
  grooming: (d) => (d.groomingTypes || []).join(', '),
  surgery: (d) => d.procedure
};

const recordRow = (r) => {
  const fileCell = r.url
    ? (isImageUrl(r.url)
        ? `<a href="${esc(r.url)}" target="_blank" rel="noopener"><img class="rec-thumb" src="${esc(r.url)}" alt="file"/></a>`
        : `<a class="rec-file-link" href="${esc(r.url)}" target="_blank" rel="noopener">View file</a>`)
    : '<span class="rec-none">—</span>';

  const primary = PRIMARY_DETAIL[r.recordType]?.(r.details || {});

  return `
    <tr>
      <td>${esc(r.date || '')}</td>
      <td class="rec-type">${esc(r.type || '')}${primary ? `<small class="rec-sub">${esc(primary)}</small>` : ''}</td>
      <td>${r.notes ? esc(r.notes) : '<span class="rec-none">—</span>'}</td>
      <td style="text-align:right">${fileCell}</td>
    </tr>
  `;
};

const renderRecords = (records) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = (records && records.length)
    ? records.map(recordRow).join('')
    : `<tr><td colspan="4" class="rec-empty"><em>No records yet.</em></td></tr>`;

  const types = Array.isArray(CATALOG?.recordTypes) ? CATALOG.recordTypes : [];

  recEl.innerHTML = `
    <form id="recForm" class="rec-form" novalidate>
      <div class="rec-row">
        <label class="rec-field"><span>Record type <b class="req">*</b></span>
          <select id="recType" required>
            <option value="">Select type…</option>
            ${types.map(t => `<option value="${esc(t.key)}">${esc(t.label)}</option>`).join('')}
          </select>
        </label>
        <label class="rec-field">Date
          <input id="recDate" type="date" value="${today}" />
        </label>
        <label class="rec-field rec-field--file">File (image/PDF)
          <input id="recFile" type="file" accept="image/*,application/pdf" />
        </label>
      </div>

      <div id="recTypeFields" class="rx-type-fields"></div>

      <label class="rec-field rec-field--notes">Notes
        <textarea id="recNotes" rows="2" placeholder="Optional notes"></textarea>
      </label>

      <div class="rec-actions">
        <button class="rec-add-btn" type="submit" id="recSubmit">+ Add record</button>
      </div>
    </form>

    <div class="table rec-table">
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>Notes</th><th style="text-align:right">File</th>
          </tr>
        </thead>
        <tbody id="recBody">${rows}</tbody>
      </table>
    </div>
  `;

  const form = document.getElementById('recForm');
  const typeSelect = document.getElementById('recType');
  const typeFields = document.getElementById('recTypeFields');

  typeSelect.addEventListener('change', () => {
    typeFields.innerHTML = window.vetlinkRecordFields.build(typeSelect.value, CATALOG);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!typeSelect.value) {
      vetlinkDialog.alert('Choose a record type first.', { variant: 'warning' });
      typeSelect.focus();
      return;
    }
    // Required type-specific fields (e.g. Vaccine name) — name the first one missing.
    const missing = Array.from(typeFields.querySelectorAll('[required]')).find(el => !String(el.value).trim());
    if (missing) {
      const label = missing.closest('label')?.querySelector('span')?.textContent.replace('*', '').trim() || 'This field';
      vetlinkDialog.alert(`${label} is required.`, { variant: 'warning' });
      missing.focus();
      return;
    }

    const submit = document.getElementById('recSubmit');
    const fd = new FormData();
    fd.append('recordType', typeSelect.value);
    fd.append('date', document.getElementById('recDate').value);
    fd.append('notes', document.getElementById('recNotes').value.trim());
    window.vetlinkRecordFields.appendTo(fd, typeFields);
    const f = document.getElementById('recFile').files[0];
    if (f) fd.append('file', f);

    submit.disabled = true;
    submit.textContent = 'Saving…';
    const { ok, body } = await fetchJSON(`/employee/pets/${encodeURIComponent(id)}/records`, {
      method: 'POST', body: fd
    });
    submit.disabled = false;
    submit.textContent = '+ Add record';

    if (ok && body && body.success) {
      await loadRecords();
    } else {
      vetlinkDialog.alert((body && body.message) ? body.message : 'Failed to add record.', { variant: 'error' });
    }
  });
};

const loadRecords = async () => {
  recEl.innerHTML = '<em>Loading records…</em>';
  const { ok, body } = await fetchJSON(`/employee/pets/${encodeURIComponent(id)}/records`);
  if (!ok || !body || body.success === false) {
    recEl.innerHTML = `<em>Failed to load records.</em>`;
    return;
  }
  renderRecords(Array.isArray(body.records) ? body.records : []);
};

// ---------- Init ----------
(async () => {
  if (!id) {
    el.innerHTML = '<em>Missing pet id.</em>';
    recEl.innerHTML = '';
    return;
  }

  const r = await fetchJSON(`/employee/pets/get?id=${encodeURIComponent(id)}`);
  if (!r.ok || !r.body || r.body.success === false) {
    el.innerHTML = '<em>Failed to load pet.</em>';
    recEl.innerHTML = '';
    return;
  }

  renderPet(r.body.pet, r.body.owner);
  await loadCatalog();
  await loadRecords();
})();
