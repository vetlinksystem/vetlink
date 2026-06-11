/* ===========================================================
   EMPLOYEE — BREEDING APPROVALS
   -----------------------------------------------------------
   APIs:
   GET /breeding/get-all            (enriched with petA/petB/ownerA/ownerB)
   PUT /breeding/admin-decision     { id, decision: 'approve'|'reject', notes? }
   =========================================================== */
(function () {
  const fetchJSON = async (url, options = {}, timeoutMs = 15000) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
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

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));

  const toastEl = document.getElementById('bxToast');
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  const summaryEl = document.getElementById('bxSummary');
  const approvalList = document.getElementById('bxApprovalList');
  const pendingCount = document.getElementById('bxPendingCount');
  const tableBody = document.getElementById('bxTableBody');
  const statusFilter = document.getElementById('bxStatusFilter');

  let RECORDS = [];

  const STATUS_TEXT = {
    pending: 'Waiting on owner',
    accepted: 'Needs approval',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled'
  };

  const renderSummary = () => {
    const count = (s) => RECORDS.filter(r => String(r.status) === s).length;
    summaryEl.innerHTML = `
      <div class="bx-pill"><strong>${RECORDS.length}</strong><span>total requests</span></div>
      <div class="bx-pill"><strong>${count('accepted')}</strong><span>need approval</span></div>
      <div class="bx-pill"><strong>${count('pending')}</strong><span>waiting on owners</span></div>
      <div class="bx-pill"><strong>${count('approved')}</strong><span>approved</span></div>
    `;
  };

  const petBlock = (pet, owner) => `
    <div class="bx-pet">
      <div class="ph">${pet?.imageUrl ? `<img src="${esc(pet.imageUrl)}" alt=""/>` : '🐾'}</div>
      <div class="nm">${esc(pet?.name || '?')}</div>
      <div class="sb">${esc(pet?.breed || pet?.species || '')} ${pet?.sex ? '• ' + esc(pet.sex) : ''}</div>
      <div class="sb">👤 ${esc(owner?.name || '')}</div>
    </div>`;

  const renderApprovals = () => {
    const list = RECORDS.filter(r => String(r.status) === 'accepted');
    pendingCount.textContent = String(list.length);

    if (!list.length) {
      approvalList.innerHTML = '<p class="bx-muted">Nothing waiting for approval. 🎉</p>';
      return;
    }

    approvalList.innerHTML = list.map(r => `
      <div class="bx-req" data-id="${esc(r.id)}">
        <div class="bx-pair">
          ${petBlock(r.petA, r.ownerA)}
          <div class="bx-heart">💞</div>
          ${petBlock(r.petB, r.ownerB)}
        </div>
        <div class="bx-req-info">
          <div class="line"><strong>${esc(r.id)}</strong> • proposed by ${r.proposedBy === 'client' ? esc(r.ownerA?.name || 'client') : 'clinic'}</div>
          <div class="line">Requested: ${esc(r.requestedAt || '—')}</div>
          <div class="line">Owner accepted: ${esc(r.respondedAt || '—')}</div>
          ${r.message ? `<div class="line">💬 “${esc(r.message)}”</div>` : ''}
        </div>
        <div class="bx-req-actions">
          <button class="bx-btn approve" data-approve="${esc(r.id)}">✓ Approve</button>
          <button class="bx-btn reject" data-reject="${esc(r.id)}">✕ Reject</button>
        </div>
      </div>
    `).join('');

    approvalList.querySelectorAll('[data-approve]').forEach(b =>
      b.addEventListener('click', () => decide(b.getAttribute('data-approve'), 'approve')));
    approvalList.querySelectorAll('[data-reject]').forEach(b =>
      b.addEventListener('click', () => decide(b.getAttribute('data-reject'), 'reject')));
  };

  const renderTable = () => {
    const filter = statusFilter.value;
    const list = filter ? RECORDS.filter(r => String(r.status) === filter) : RECORDS;

    if (!list.length) {
      tableBody.innerHTML = '<tr><td colspan="7" class="bx-muted">No records.</td></tr>';
      return;
    }

    tableBody.innerHTML = list.map(r => `
      <tr>
        <td><strong>${esc(r.id)}</strong></td>
        <td>${esc(r.petA?.name || r.petAId)} × ${esc(r.petB?.name || r.petBId)}</td>
        <td>${esc(r.ownerA?.name || r.ownerAId)} / ${esc(r.ownerB?.name || r.ownerBId)}</td>
        <td>${r.proposedBy === 'client' ? esc(r.ownerA?.name || 'client') : 'Clinic'}</td>
        <td>${esc(r.requestedAt || '—')}</td>
        <td><span class="bx-status ${esc(r.status)}">${esc(STATUS_TEXT[r.status] || r.status)}</span></td>
        <td>
          ${String(r.status) === 'accepted'
            ? `<button class="bx-btn approve" data-approve="${esc(r.id)}">Approve</button>`
            : ''}
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('[data-approve]').forEach(b =>
      b.addEventListener('click', () => decide(b.getAttribute('data-approve'), 'approve')));
  };

  const decide = async (id, decision) => {
    let notes = '';
    if (decision === 'reject') {
      notes = prompt('Reason for rejecting (optional, shown to both owners):') || '';
    } else {
      const r = RECORDS.find(x => String(x.id) === String(id));
      const pair = r ? `${r.petA?.name || r.petAId} × ${r.petB?.name || r.petBId}` : id;
      if (!confirm(`Approve breeding ${pair}?\nBoth pets will be reserved and hidden from the match list, and other open proposals for them will be cancelled.`)) return;
    }

    const { ok, body } = await fetchJSON('/breeding/admin-decision', {
      method: 'PUT',
      body: JSON.stringify({ id, decision, notes })
    });

    if (!ok || body.success === false) {
      toast(body?.message || 'Failed to update record.');
      return;
    }
    toast(body.message || 'Updated.');
    load();
  };

  const load = async () => {
    const { ok, status, body } = await fetchJSON('/breeding/get-all');
    if (!ok) {
      const msg = status === 403
        ? 'Only veterinarians and admins can manage breeding.'
        : 'Failed to load breeding records.';
      approvalList.innerHTML = `<p class="bx-muted">${esc(msg)}</p>`;
      tableBody.innerHTML = `<tr><td colspan="7" class="bx-muted">${esc(msg)}</td></tr>`;
      return;
    }
    RECORDS = Array.isArray(body) ? body : (body.records || []);
    renderSummary();
    renderApprovals();
    renderTable();
  };

  statusFilter.addEventListener('change', renderTable);

  load();
  // Keep the approval queue fresh
  setInterval(load, 30000);
})();
