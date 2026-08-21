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

  /**
   * Only a veterinarian may act on a breeding match. Admin and staff see the same
   * records read-only. core.js publishes the permission list from the server; the API
   * enforces it too, so this is purely about not showing buttons that would 403.
   */
  const canDecide = () => !!(window.vetlinkCan && window.vetlinkCan('breeding.decide'));

  // Lifecycle: pending → accepted → approved → cleared → completed
  // "cleared" means both pets passed the final pre-breeding health examination.
  const STATUS_TEXT = {
    pending: 'Waiting on owner',
    accepted: 'Needs approval',
    approved: 'Awaiting final exam',
    cleared: 'Cleared to breed',
    completed: 'Completed',
    rejected: 'Not recommended',
    cancelled: 'Cancelled'
  };

  const renderSummary = () => {
    const count = (s) => RECORDS.filter(r => String(r.status) === s).length;
    summaryEl.innerHTML = `
      <div class="bx-pill"><strong>${RECORDS.length}</strong><span>total requests</span></div>
      <div class="bx-pill"><strong>${count('accepted')}</strong><span>need approval</span></div>
      <div class="bx-pill"><strong>${count('pending')}</strong><span>waiting on owners</span></div>
      <div class="bx-pill"><strong>${count('approved')}</strong><span>awaiting final exam</span></div>
      <div class="bx-pill"><strong>${count('cleared')}</strong><span>cleared to breed</span></div>
      <div class="bx-pill"><strong>${count('completed')}</strong><span>completed</span></div>
    `;
  };

  const petBlock = (pet, owner) => `
    <div class="bx-pet">
      <div class="ph">${pet?.imageUrl ? `<img src="${esc(pet.imageUrl)}" alt=""/>` : '🐾'}</div>
      <div class="nm">${esc(pet?.name || '?')}</div>
      <div class="sb">${esc(pet?.breed || pet?.species || '')} ${pet?.sex ? '• ' + esc(pet.sex) : ''}</div>
      <div class="sb">👤 ${esc(owner?.name || '')}</div>
    </div>`;

  // ===== Compatibility / risk report =====
  // The crossbreeding document requires the vet to see the compatibility score, the
  // estimated risk and the reasons before deciding. This renders that assessment.

  const riskClass = (risk) => String(risk || '').toLowerCase();

  const riskChip = (c) => {
    if (!c) return '';
    return `<span class="bx-risk ${riskClass(c.risk)}">${esc(c.risk)} risk</span>
            <span class="bx-score">${esc(c.score)}<small>/100</small></span>`;
  };

  const breedStatusText = (s) => ({
    compatible: 'Compatible',
    veterinary_review: 'Veterinary review',
    not_allowed: 'Not allowed'
  }[String(s)] || '—');

  const riskReport = (c) => {
    if (!c) return '<div class="bx-muted">No compatibility assessment on this record.</div>';

    const bars = (c.breakdown || []).map(b => {
      const pct = b.max ? Math.round((b.points / b.max) * 100) : 0;
      return `
        <div class="bx-crit">
          <div class="bx-crit-head">
            <span>${esc(b.label)}</span>
            <span class="bx-crit-pts">${esc(b.points)}/${esc(b.max)}</span>
          </div>
          <div class="bx-crit-bar"><i style="width:${pct}%"></i></div>
          <div class="bx-crit-detail">${esc(b.detail || '')}</div>
        </div>`;
    }).join('');

    const flags = (c.flags || []).length
      ? `<ul class="bx-flags">${c.flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`
      : '<div class="bx-noflags">No risk factors flagged.</div>';

    return `
      <div class="bx-report">
        <div class="bx-report-head">
          ${riskChip(c)}
          <span class="bx-breedstat ${esc(c.breedStatus)}">Breed pair: ${esc(breedStatusText(c.breedStatus))}</span>
        </div>
        <div class="bx-reco">${esc(c.recommendation || '')}</div>
        <div class="bx-crits">${bars}</div>
        <div class="bx-flags-wrap">
          <strong>Risk factors</strong>
          ${flags}
        </div>
        ${c.requiresVetReview
          ? '<div class="bx-mustreview">⚠️ Flagged for veterinary review — this pairing cannot be approved without conditions.</div>'
          : ''}
        ${c.assessedOnRead
          ? '<div class="bx-muted bx-assessnote">Assessed now (this proposal predates compatibility scoring).</div>'
          : ''}
      </div>`;
  };

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
          ${r.breedingType ? `<div class="line">Type: <strong>${esc(r.breedingType)}</strong>${r.breedingPurpose ? ` • ${esc(r.breedingPurpose)}` : ''}</div>` : ''}
          ${r.message ? `<div class="line">💬 “${esc(r.message)}”</div>` : ''}
        </div>

        <!-- Veterinary risk assessment: the vet must see this before deciding. -->
        ${riskReport(r.compatibility)}

        <div class="bx-req-actions">
          ${canDecide()
            ? `${r.compatibility?.requiresVetReview
                  ? ''
                  : `<button class="bx-btn approve" data-approve="${esc(r.id)}">✓ Approve</button>`}
               <button class="bx-btn conditions" data-conditions="${esc(r.id)}">⚠ Approve with conditions</button>
               <button class="bx-btn reject" data-reject="${esc(r.id)}">✕ Not recommended</button>`
            : `<span class="bx-viewonly">View only — a veterinarian decides this match.</span>`}
        </div>
      </div>
    `).join('');

    approvalList.querySelectorAll('[data-approve]').forEach(b =>
      b.addEventListener('click', () => decide(b.getAttribute('data-approve'), 'approve')));
    approvalList.querySelectorAll('[data-conditions]').forEach(b =>
      b.addEventListener('click', () => decide(b.getAttribute('data-conditions'), 'approve_with_conditions')));
    approvalList.querySelectorAll('[data-reject]').forEach(b =>
      b.addEventListener('click', () => decide(b.getAttribute('data-reject'), 'reject')));
  };

  const renderTable = () => {
    const filter = statusFilter.value;
    const list = filter ? RECORDS.filter(r => String(r.status) === filter) : RECORDS;

    if (!list.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="bx-muted">No records.</td></tr>';
      return;
    }

    tableBody.innerHTML = list.map(r => `
      <tr>
        <td><strong>${esc(r.id)}</strong></td>
        <td>${esc(r.petA?.name || r.petAId)} × ${esc(r.petB?.name || r.petBId)}</td>
        <td>${esc(r.ownerA?.name || r.ownerAId)} / ${esc(r.ownerB?.name || r.ownerBId)}</td>
        <td>${r.proposedBy === 'client' ? esc(r.ownerA?.name || 'client') : 'Clinic'}</td>
        <td>${esc(r.requestedAt || '—')}</td>
        <td>
          <span class="bx-status ${esc(r.status)}">${esc(STATUS_TEXT[r.status] || r.status)}</span>
          ${r.decisionOutcome === 'approved_with_conditions'
            ? '<br><small class="bx-cond-note">with conditions</small>' : ''}
        </td>
        <td>${r.compatibility ? riskChip(r.compatibility) : '<span class="bx-muted">—</span>'}</td>
        <td>
          ${!canDecide()
            ? '<span class="bx-muted">—</span>'
            : String(r.status) === 'accepted'
              ? `<button class="bx-btn conditions" data-conditions="${esc(r.id)}">Decide</button>`
              : String(r.status) === 'approved'
                // Step 9: both pets must pass a final examination before breeding.
                ? `<button class="bx-btn clearance" data-clearance="${esc(r.id)}">Final exam</button>`
                : String(r.status) === 'cleared'
                  // Step 10: record the breeding, then close it out.
                  ? `<button class="bx-btn record" data-record="${esc(r.id)}">${r.breedingDetails ? 'Edit record' : 'Breeding record'}</button>
                     ${r.breedingDetails ? `<button class="bx-btn monitor" data-monitor="${esc(r.id)}">Monitoring</button>
                                            <button class="bx-btn complete" data-complete="${esc(r.id)}">Complete</button>` : ''}`
                  : String(r.status) === 'completed' && r.breedingDetails
                    ? `<button class="bx-btn monitor" data-monitor="${esc(r.id)}">Monitoring</button>
                       <button class="bx-btn offspring" data-offspring="${esc(r.id)}">Offspring</button>`
                    : ''}
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('[data-approve]').forEach(b =>
      b.addEventListener('click', () => decide(b.getAttribute('data-approve'), 'approve')));
    tableBody.querySelectorAll('[data-conditions]').forEach(b =>
      b.addEventListener('click', () => decide(b.getAttribute('data-conditions'), 'approve_with_conditions')));
    tableBody.querySelectorAll('[data-complete]').forEach(b =>
      b.addEventListener('click', () => decide(b.getAttribute('data-complete'), 'complete')));

    // Post-approval steps
    tableBody.querySelectorAll('[data-clearance]').forEach(b =>
      b.addEventListener('click', () => finalExam(b.getAttribute('data-clearance'))));
    tableBody.querySelectorAll('[data-record]').forEach(b =>
      b.addEventListener('click', () => breedingRecord(b.getAttribute('data-record'))));
    tableBody.querySelectorAll('[data-monitor]').forEach(b =>
      b.addEventListener('click', () => monitoring(b.getAttribute('data-monitor'))));
    tableBody.querySelectorAll('[data-offspring]').forEach(b =>
      b.addEventListener('click', () => offspring(b.getAttribute('data-offspring'))));
  };

  // ===========================================================
  // POST-APPROVAL STEPS
  // Step 9 final examination → step 10 breeding record → monitoring → offspring.
  // ===========================================================

  /** Step 9: the final pre-breeding health examination of both pets. */
  const finalExam = async (id) => {
    const r = RECORDS.find(x => String(x.id) === String(id));
    if (!r) return;
    const a = r.petA?.name || r.petAId;
    const b = r.petB?.name || r.petBId;

    const aFit = confirm(`Final health examination — ${a} × ${b}\n\nIs ${a} fit to breed?\n\nOK = fit, Cancel = not fit`);
    const bFit = confirm(`Is ${b} fit to breed?\n\nOK = fit, Cancel = not fit`);

    const findings = prompt(
      (aFit && bFit)
        ? 'Examination findings (optional):'
        : 'Findings — why is the pet not fit to breed? (shown to both owners):'
    ) || '';

    if (!aFit || !bFit) {
      if (!confirm('This will STOP the breeding and release both pets. Continue?')) return;
    }

    const { ok, body } = await fetchJSON('/breeding/clearance', {
      method: 'PUT',
      body: JSON.stringify({ id, petAFit: aFit, petBFit: bFit, findings })
    });

    if (!ok || body.success === false) { toast(body?.message || 'Failed to record the examination.'); return; }
    toast(body.status === 'cleared' ? 'Cleared to breed.' : 'Breeding stopped — pet not fit.');
    load();
  };

  /** Step 10: the breeding record. Sire and dam come from the approved pair. */
  const breedingRecord = async (id) => {
    const r = RECORDS.find(x => String(x.id) === String(id));
    if (!r) return;

    const existing = r.breedingDetails || {};
    const today = new Date().toISOString().slice(0, 10);

    const breedingDate = prompt('Breeding date (YYYY-MM-DD):', existing.breedingDate || today);
    if (breedingDate === null) return;

    const matingType = prompt(
      'Mating type — type "natural" or "artificial_insemination":',
      existing.matingType || 'natural'
    );
    if (matingType === null) return;

    const numberOfMating = prompt('Number of matings:', existing.numberOfMating || '1');
    if (numberOfMating === null) return;

    const place = prompt('Place / location:', existing.place || '') || '';
    const studFee = prompt('Stud fee (leave blank if none):', existing.studFee ?? '') || '';
    const estimatedLitterSize = prompt('Estimated litter size (e.g. 3 - 6):', existing.estimatedLitterSize || '') || '';
    const healthObservations = prompt('Health observations:', existing.healthObservations || '') || '';
    const notes = prompt('Additional notes:', existing.notes || '') || '';

    const { ok, body } = await fetchJSON('/breeding/record', {
      method: 'PUT',
      body: JSON.stringify({
        id, breedingDate, matingType, numberOfMating, place, studFee,
        estimatedLitterSize, healthObservations, notes
      })
    });

    if (!ok || body.success === false) { toast(body?.message || 'Failed to save the breeding record.'); return; }
    toast(`Recorded. Expected due date ${body.breedingDetails.expectedDueDate}.`);
    load();
  };

  /** Pregnancy status and the monitoring check-up schedule. */
  const monitoring = async (id) => {
    const r = RECORDS.find(x => String(x.id) === String(id));
    if (!r || !r.monitoring) { toast('No monitoring schedule on this record.'); return; }

    const m = r.monitoring;
    const lines = (m.schedule || []).map((s, i) =>
      `${i + 1}. ${s.label} — due ${s.dueDate} [${s.status}]`).join('\n');

    const choice = prompt(
      `Monitoring — ${r.breedingDetails?.combination || ''}\n`
      + `Pregnancy status: ${m.pregnancyStatus}\n`
      + `Expected due date: ${m.expectedDueDate || '—'}\n\n`
      + `${lines}\n\n`
      + 'Type a pregnancy status (unconfirmed / confirmed / not_pregnant / delivered),\n'
      + 'or a step number to mark it done:'
    );
    if (choice === null || !choice.trim()) return;

    const value = choice.trim().toLowerCase();
    const payload = { id };

    if (/^\d+$/.test(value)) {
      const step = (m.schedule || [])[Number(value) - 1];
      if (!step) { toast('No such step.'); return; }
      payload.stepKey = step.key;
      payload.stepStatus = 'done';
      payload.stepNotes = prompt(`Notes for "${step.label}":`, step.notes || '') || '';
    } else {
      payload.pregnancyStatus = value;
      if (value === 'confirmed') {
        payload.confirmedDate = prompt('Confirmation date (YYYY-MM-DD):',
          new Date().toISOString().slice(0, 10)) || '';
      }
    }

    const { ok, body } = await fetchJSON('/breeding/pregnancy', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!ok || body.success === false) { toast(body?.message || 'Failed to update monitoring.'); return; }
    toast('Monitoring updated.');
    load();
  };

  /** Offspring records for a completed breeding. */
  const offspring = async (id) => {
    const r = RECORDS.find(x => String(x.id) === String(id));
    if (!r) return;

    const deliveryDate = prompt('Delivery date (YYYY-MM-DD):',
      r.monitoring?.deliveredAt || new Date().toISOString().slice(0, 10));
    if (deliveryDate === null) return;

    const entered = prompt(
      'Offspring — one per line, as:  name, sex, weight_kg, status\n'
      + 'status is "alive" or "stillborn" (defaults to alive).\n\n'
      + 'Example:\n  Pup 1, Male, 0.4, alive\n  Pup 2, Female, 0.35, alive',
      (r.offspring || []).map(o =>
        `${o.name}, ${o.sex}, ${o.weight ?? ''}, ${o.status}`).join('\n')
    );
    if (entered === null) return;

    const list = entered.split('\n').map(line => {
      const [name, sex, weight, status] = line.split(',').map(s => (s || '').trim());
      return { name, sex, weight, status };
    }).filter(o => o.name || o.sex);

    if (!list.length) { toast('Add at least one offspring.'); return; }

    const { ok, body } = await fetchJSON('/breeding/offspring', {
      method: 'PUT',
      body: JSON.stringify({ id, deliveryDate, offspring: list })
    });

    if (!ok || body.success === false) { toast(body?.message || 'Failed to save offspring records.'); return; }
    toast(`${body.offspring.length} offspring recorded.`);
    load();
  };

  // Suggested conditions, offered when the vet approves with conditions. Which ones are
  // pre-ticked depends on what the assessment actually flagged.
  const CONDITION_LIBRARY = [
    { key: 'size',        text: 'Caesarean section to be available; monitor closely due to size difference.' },
    { key: 'health',      text: 'Both pets must pass a pre-breeding health examination first.' },
    { key: 'genetic',     text: 'Genetic screening required for known hereditary conditions of these breeds.' },
    { key: 'age',         text: 'Additional reproductive assessment required due to age.' },
    { key: 'temperament', text: 'Supervised introduction required; abort if either animal shows aggression.' },
    { key: 'monitoring',  text: 'Pregnancy to be monitored at the clinic with scheduled check-ups.' },
    { key: 'supervised',  text: 'Mating must take place at the clinic under veterinary supervision.' }
  ];

  const suggestedConditions = (c) => {
    const flags = (c?.flags || []).join(' ').toLowerCase();
    const picked = new Set(['health', 'monitoring']); // always sensible
    if (/size|weight/.test(flags)) picked.add('size');
    if (/hereditar|genetic/.test(flags)) picked.add('genetic');
    if (/age/.test(flags)) picked.add('age');
    if (/aggress|temperament/.test(flags)) picked.add('temperament');
    return picked;
  };

  const decide = async (id, decision) => {
    let notes = '';
    let conditions = [];
    const r = RECORDS.find(x => String(x.id) === String(id));
    const pair = r ? `${r.petA?.name || r.petAId} × ${r.petB?.name || r.petBId}` : id;

    if (decision === 'reject') {
      notes = prompt(
        `Not recommending breeding ${pair}.\n\n`
        + 'Reason (shown to both owners):'
      ) || '';
    } else if (decision === 'complete') {
      if (!confirm(`Mark breeding ${pair} as completed?\nBoth pets will become available for breeding again.`)) return;
    } else if (decision === 'approve_with_conditions') {
      const picked = suggestedConditions(r?.compatibility);
      const suggested = CONDITION_LIBRARY
        .filter(c => picked.has(c.key))
        .map(c => c.text)
        .join('\n');

      const entered = prompt(
        `Approve breeding ${pair} WITH CONDITIONS.\n\n`
        + 'One condition per line. These are recorded and sent to both owners.\n'
        + 'Suggested conditions are pre-filled — edit as needed:',
        suggested
      );
      if (entered === null) return; // cancelled

      conditions = entered.split('\n').map(s => s.trim()).filter(Boolean);
      if (!conditions.length) {
        toast('At least one condition is required.');
        return;
      }
      notes = prompt('Additional note for the owners (optional):') || '';
    } else {
      if (!confirm(`Approve breeding ${pair}?\nBoth pets will be reserved and hidden from the match list, and other open proposals for them will be cancelled.`)) return;
    }

    const { ok, body } = await fetchJSON('/breeding/admin-decision', {
      method: 'PUT',
      body: JSON.stringify({ id, decision, notes, conditions })
    });

    if (!ok || body.success === false) {
      // A flagged pairing cannot be plain-approved; the server says so and the vet
      // is redirected to the conditions path.
      if (body?.requiresConditions) {
        toast(body.message);
        return decide(id, 'approve_with_conditions');
      }
      toast(body?.message || 'Failed to update record.');
      return;
    }
    toast(body.message || (body.outcome === 'approved_with_conditions'
      ? 'Approved with conditions.' : 'Updated.'));
    load();
  };

  const load = async () => {
    const { ok, status, body } = await fetchJSON('/breeding/get-all');
    if (!ok) {
      const msg = status === 403
        ? (body?.message || 'Your role is not allowed to view breeding records.')
        : 'Failed to load breeding records.';
      approvalList.innerHTML = `<p class="bx-muted">${esc(msg)}</p>`;
      tableBody.innerHTML = `<tr><td colspan="8" class="bx-muted">${esc(msg)}</td></tr>`;
      return;
    }
    RECORDS = Array.isArray(body) ? body : (body.records || []);
    renderSummary();
    renderApprovals();
    renderTable();
  };

  statusFilter.addEventListener('change', renderTable);

  // core.js resolves the role asynchronously; re-render once it lands so the decision
  // buttons appear (or stay hidden) according to the real permission list.
  document.addEventListener('vetlink:role-ready', () => {
    if (!RECORDS.length) return;
    renderApprovals();
    renderTable();
  });

  load();
  // Keep the approval queue fresh
  setInterval(load, 30000);
})();
