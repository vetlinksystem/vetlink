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
const recordRow = (r) => {
  const fileCell = r.url
    ? (isImageUrl(r.url)
        ? `<a href="${esc(r.url)}" target="_blank" rel="noopener"><img class="rec-thumb" src="${esc(r.url)}" alt="file"/></a>`
        : `<a class="rec-file-link" href="${esc(r.url)}" target="_blank" rel="noopener">View file</a>`)
    : '<span class="rec-none">—</span>';

  return `
    <tr>
      <td>${esc(r.date || '')}</td>
      <td class="rec-type">${esc(r.type || '')}</td>
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

  recEl.innerHTML = `
    <form id="recForm" class="rec-toolbar">
      <label class="rec-field">Type
        <input id="recType" list="recTypes" placeholder="Vaccination" />
        <datalist id="recTypes">
          <option value="Vaccination"></option><option value="Lab Result"></option>
          <option value="Prescription"></option><option value="Visit Summary"></option>
          <option value="Surgery"></option><option value="Deworming"></option>
        </datalist>
      </label>
      <label class="rec-field">Date
        <input id="recDate" type="date" value="${today}" />
      </label>
      <label class="rec-field rec-field--notes">Notes
        <input id="recNotes" placeholder="Optional notes" />
      </label>
      <label class="rec-field rec-field--file">File (image/PDF)
        <input id="recFile" type="file" accept="image/*,application/pdf" />
      </label>
      <button class="rec-add-btn" type="submit" id="recSubmit">+ Add record</button>
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
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = document.getElementById('recSubmit');
    const fd = new FormData();
    fd.append('type', document.getElementById('recType').value.trim());
    fd.append('date', document.getElementById('recDate').value);
    fd.append('notes', document.getElementById('recNotes').value.trim());
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
      alert((body && body.message) ? body.message : 'Failed to add record.');
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
  await loadRecords();
})();
