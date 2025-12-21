/* ===========================================================
   CLIENT — RECORDS
   -----------------------------------------------------------
   API: GET /client/records/my
   → { success:true, records:[{id,petId,petName,type,date,notes,url}], pets:[{id,name}] }
   =========================================================== */

(function () {
  const API_MY_RECORDS = '/client/records/my';

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
      console.error('client records fetch error', err);
      return { ok:false, status:0, body:{ message: err.message } };
    }
  };

  const esc = (s) =>
    (s ?? '').toString().replace(/[&<>\"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));

  const fmtDate = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
      month:'short', day:'2-digit', year:'numeric'
    });

  // DOM
  const tbody       = document.querySelector('#recordsTable tbody');
  const pageInfo    = document.getElementById('recordsPageInfo');
  const prevBtn     = document.getElementById('prevRecords');
  const nextBtn     = document.getElementById('nextRecords');
  const searchBox   = document.getElementById('recordSearch');
  const petFilter   = document.getElementById('filterPet');
  const typeFilter  = document.getElementById('filterType');

  const toast       = document.getElementById('toast');

  if (!tbody) return;

  // State
  let RECORDS = [];
  let PETS    = [];
  let search  = '';
  let petFilterVal  = '';
  let typeFilterVal = '';
  let page   = 1;
  const pageSize = 10;

  const showToast = (msg) => {
    if (!toast) { alert(msg); return; }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 2200);
  };

  const rowHTML = (r) => `
    <tr>
      <td>${fmtDate(r.date)}</td>
      <td>${esc(r.petName)}</td>
      <td>${esc(r.type)}</td>
      <td>${esc(r.notes || '')}</td>
      <td style="text-align:right">
        ${r.url
          ? `<a href="${esc(r.url)}" class="btn secondary" target="_blank" rel="noopener">View</a>`
          : '<span style="color:var(--muted)">No file</span>'}
      </td>
    </tr>
  `;

  const renderTable = () => {
    const q = (search || '').trim().toLowerCase();

    const list = RECORDS
      .filter(r => !petFilterVal  || String(r.petId) === petFilterVal)
      .filter(r => !typeFilterVal || r.type === typeFilterVal)
      .filter(r => {
        if (!q) return true;
        return [r.petName, r.type, r.notes].some(v =>
          String(v || '').toLowerCase().includes(q)
        );
      })
      .sort((a,b)=> (a.date).localeCompare(b.date) * -1); // newest first

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize);

    tbody.innerHTML = items.length
      ? items.map(rowHTML).join('')
      : `<tr><td colspan="5" style="padding:.75rem;color:var(--muted)"><em>No records found.</em></td></tr>`;

    if (pageInfo) {
      pageInfo.textContent = items.length
        ? `${start + 1}–${Math.min(start + pageSize, total)} of ${total}`
        : `0–0 of 0`;
    }

    if (prevBtn) prevBtn.disabled = page === 1;
    if (nextBtn) nextBtn.disabled = page === totalPages;
  };

  const syncFilters = () => {
    if (petFilter) {
      petFilter.innerHTML = '<option value="">All pets</option>' +
        PETS.map(p =>
          `<option value="${esc(p.id)}">${esc(p.name)}</option>`
        ).join('');
    }

    if (typeFilter) {
      const types = [...new Set(RECORDS.map(r => r.type).filter(Boolean))]
        .sort((a,b)=> String(a).localeCompare(String(b)));

      typeFilter.innerHTML = '<option value="">All types</option>' +
        types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    }
  };

  // Events
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (page > 1) page--;
    renderTable();
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    page++;
    renderTable();
  });

  if (searchBox) {
    searchBox.addEventListener('input', (e) => {
      search = e.target.value || '';
      page = 1;
      renderTable();
    });
  }

  if (petFilter) {
    petFilter.addEventListener('change', (e) => {
      petFilterVal = e.target.value || '';
      page = 1;
      renderTable();
    });
  }

  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      typeFilterVal = e.target.value || '';
      page = 1;
      renderTable();
    });
  }

  // Init
  (async function bootstrap() {
    tbody.innerHTML =
      `<tr><td colspan="5" style="padding:.75rem;color:var(--muted)">
        <em>Loading records…</em>
       </td></tr>`;

    const { ok, body } = await fetchJSON(API_MY_RECORDS, { method: 'GET' });

    if (!ok || !body || body.success === false) {
      tbody.innerHTML =
        `<tr><td colspan="5" style="padding:.75rem;color:var(--muted)">
          <em>Failed to load records. ${esc(body?.message || '')}</em>
         </td></tr>`;
      showToast('Failed to load records.');
      return;
    }

    RECORDS = Array.isArray(body.records) ? body.records : [];
    PETS    = Array.isArray(body.pets) ? body.pets : [];

    syncFilters();
    renderTable();
  })();
})();
