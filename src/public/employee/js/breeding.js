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

  // Every multi-answer flow below runs through the shared step dialog (js/wizard.js)
  // instead of a chain of browser confirm()/prompt() boxes.
  const wizard = window.vetlinkWizard;

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

  const FIT_OPTIONS = [
    { value: 'yes', label: 'Fit to breed', hint: 'Passed the examination' },
    { value: 'no', label: 'Not fit', hint: 'Stops the breeding' }
  ];

  /** Step 9: the final pre-breeding health examination of both pets. */
  const finalExam = async (id) => {
    const r = RECORDS.find(x => String(x.id) === String(id));
    if (!r) return;
    const a = r.petA?.name || r.petAId;
    const b = r.petB?.name || r.petBId;

    const answers = await wizard.open({
      title: 'Final health examination',
      subtitle: `${a} × ${b} • ${r.id}`,
      submitLabel: 'Save examination',
      reviewIntro: 'This result is recorded on the breeding and shown to both owners.',
      steps: [
        {
          title: a,
          intro: `Examine ${a} and record whether the pet is fit to breed.`,
          fields: [{
            name: 'aFit', label: `Is ${a} fit to breed?`, type: 'radio',
            options: FIT_OPTIONS, value: 'yes', required: true
          }]
        },
        {
          title: b,
          intro: `Examine ${b} and record whether the pet is fit to breed.`,
          fields: [{
            name: 'bFit', label: `Is ${b} fit to breed?`, type: 'radio',
            options: FIT_OPTIONS, value: 'yes', required: true
          }]
        },
        {
          title: 'Findings',
          fields: [
            {
              name: 'findings', type: 'textarea',
              label: 'Examination findings',
              placeholder: 'What was observed during the examination…',
              hint: 'Shown to both owners.'
            },
            // A failed examination ends the breeding, so it is confirmed in the flow
            // rather than in a second dialog the vet could dismiss by accident.
            {
              name: 'stopAck', type: 'checkbox',
              checkboxLabel: 'I understand this stops the breeding and releases both pets.',
              showIf: (d) => d.aFit === 'no' || d.bFit === 'no',
              required: true,
              requiredMessage: 'Confirm that you want to stop this breeding.'
            }
          ],
          validate: (d) => (d.aFit === 'no' || d.bFit === 'no') && !String(d.findings || '').trim()
            ? 'Findings are required when a pet is not fit to breed.'
            : null
        }
      ]
    });
    if (!answers) return;

    const { ok, body } = await fetchJSON('/breeding/clearance', {
      method: 'PUT',
      body: JSON.stringify({
        id,
        petAFit: answers.aFit === 'yes',
        petBFit: answers.bFit === 'yes',
        findings: answers.findings || ''
      })
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
    const pair = `${r.petA?.name || r.petAId} × ${r.petB?.name || r.petBId}`;

    const answers = await wizard.open({
      title: existing.breedingDate ? 'Edit breeding record' : 'Breeding record',
      subtitle: `${pair} • ${r.id}`,
      submitLabel: 'Save record',
      reviewIntro: 'The expected due date is calculated from the breeding date once saved.',
      steps: [
        {
          title: 'Mating',
          fields: [
            {
              name: 'breedingDate', label: 'Breeding date', type: 'date',
              value: existing.breedingDate || today, required: true, max: today,
              validate: (v) => new Date(v) > new Date() ? 'The breeding date cannot be in the future.' : null
            },
            {
              name: 'matingType', label: 'Mating type', type: 'radio', required: true,
              value: existing.matingType || 'natural',
              options: [
                { value: 'natural', label: 'Natural' },
                { value: 'artificial_insemination', label: 'Artificial insemination' }
              ]
            },
            {
              name: 'numberOfMating', label: 'Number of matings', type: 'number',
              value: existing.numberOfMating || '1', min: 1, required: true
            },
            { name: 'place', label: 'Place / location', type: 'text', value: existing.place || '' }
          ]
        },
        {
          title: 'Details',
          fields: [
            {
              name: 'studFee', label: 'Stud fee', type: 'text',
              value: existing.studFee ?? '', placeholder: 'Leave blank if none'
            },
            {
              name: 'estimatedLitterSize', label: 'Estimated litter size', type: 'text',
              value: existing.estimatedLitterSize || '', placeholder: 'e.g. 3 - 6'
            }
          ]
        },
        {
          title: 'Observations',
          fields: [
            {
              name: 'healthObservations', label: 'Health observations', type: 'textarea',
              value: existing.healthObservations || ''
            },
            { name: 'notes', label: 'Additional notes', type: 'textarea', value: existing.notes || '' }
          ]
        }
      ]
    });
    if (!answers) return;

    const { ok, body } = await fetchJSON('/breeding/record', {
      method: 'PUT',
      body: JSON.stringify({ id, ...answers })
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
    const schedule = m.schedule || [];
    const today = new Date().toISOString().slice(0, 10);

    // The check-up schedule is read-only context; the vet picks what to update.
    const scheduleHtml = schedule.length
      ? `<dl class="vwz-review">${schedule.map(s => `
          <div class="vwz-review-row">
            <dt>${esc(s.label)}</dt>
            <dd>due ${esc(s.dueDate)} — ${esc(s.status)}</dd>
          </div>`).join('')}</dl>`
      : '<p class="vwz-hint">No check-ups scheduled.</p>';

    const answers = await wizard.open({
      title: 'Pregnancy monitoring',
      subtitle: `${r.breedingDetails?.combination || r.id} • due ${m.expectedDueDate || '—'}`,
      submitLabel: 'Save update',
      steps: [
        {
          title: 'Current',
          fields: [{
            type: 'static',
            html: `<p class="vwz-intro">Pregnancy status: <strong>${esc(m.pregnancyStatus)}</strong></p>${scheduleHtml}`
          }]
        },
        {
          title: 'What to update',
          fields: [{
            name: 'mode', label: 'What are you updating?', type: 'radio', required: true, value: 'status',
            options: [
              { value: 'status', label: 'Pregnancy status', hint: 'Confirmed, not pregnant, delivered' },
              { value: 'step', label: 'A scheduled check-up', hint: 'Mark a check-up as done' }
            ]
          }]
        },
        {
          title: 'Details',
          fields: [
            {
              name: 'pregnancyStatus', label: 'Pregnancy status', type: 'select',
              value: m.pregnancyStatus || 'unconfirmed',
              showIf: (d) => d.mode === 'status',
              options: [
                { value: 'unconfirmed', label: 'Unconfirmed' },
                { value: 'confirmed', label: 'Confirmed pregnant' },
                { value: 'not_pregnant', label: 'Not pregnant' },
                { value: 'delivered', label: 'Delivered' }
              ]
            },
            {
              name: 'confirmedDate', label: 'Confirmation date', type: 'date', value: today,
              showIf: (d) => d.mode === 'status' && d.pregnancyStatus === 'confirmed'
            },
            {
              name: 'stepKey', label: 'Check-up', type: 'select',
              showIf: (d) => d.mode === 'step',
              required: true,
              value: schedule[0]?.key || '',
              options: schedule.map(s => ({ value: s.key, label: `${s.label} — due ${s.dueDate}` }))
            },
            {
              name: 'stepNotes', label: 'Check-up notes', type: 'textarea',
              showIf: (d) => d.mode === 'step'
            }
          ]
        }
      ]
    });
    if (!answers) return;

    const payload = answers.mode === 'step'
      ? { id, stepKey: answers.stepKey, stepStatus: 'done', stepNotes: answers.stepNotes || '' }
      : {
          id,
          pregnancyStatus: answers.pregnancyStatus,
          ...(answers.pregnancyStatus === 'confirmed' ? { confirmedDate: answers.confirmedDate || '' } : {})
        };

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

    const today = new Date().toISOString().slice(0, 10);

    const answers = await wizard.open({
      title: 'Offspring records',
      subtitle: `${r.petA?.name || r.petAId} × ${r.petB?.name || r.petBId} • ${r.id}`,
      submitLabel: 'Save offspring',
      steps: [
        {
          title: 'Delivery',
          fields: [{
            name: 'deliveryDate', label: 'Delivery date', type: 'date', required: true, max: today,
            value: r.monitoring?.deliveredAt || today
          }]
        },
        {
          title: 'Litter',
          intro: 'One offspring per line: name, sex, weight in kg, status.',
          fields: [{
            name: 'rows', label: 'Offspring', type: 'lines', required: true, rows: 7,
            hint: 'status is "alive" or "stillborn" — it defaults to alive.',
            placeholder: 'Pup 1, Male, 0.4, alive\nPup 2, Female, 0.35, alive',
            value: (r.offspring || []).map(o => `${o.name}, ${o.sex}, ${o.weight ?? ''}, ${o.status}`),
            validate: (v) => v.some(line => !line.split(',')[0]?.trim())
              ? 'Every line needs a name before the first comma.'
              : null
          }]
        }
      ]
    });
    if (!answers) return;

    const list = answers.rows.map(line => {
      const [name, sex, weight, status] = line.split(',').map(s => (s || '').trim());
      return { name, sex, weight, status };
    }).filter(o => o.name || o.sex);

    if (!list.length) { toast('Add at least one offspring.'); return; }

    const deliveryDate = answers.deliveryDate;
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
      const answers = await wizard.open({
        title: 'Not recommended',
        subtitle: `${pair} • ${id}`,
        submitLabel: 'Record decision',
        reviewIntro: 'The reason below is sent to both owners.',
        steps: [{
          title: 'Reason',
          intro: `You are recording that breeding ${pair} is not recommended.`,
          fields: [{
            name: 'notes', label: 'Reason (shown to both owners)', type: 'textarea',
            required: true, rows: 5
          }]
        }]
      });
      if (!answers) return;
      notes = answers.notes;
    } else if (decision === 'complete') {
      const ok = await wizard.confirm({
        title: 'Complete breeding',
        subtitle: `${pair} • ${id}`,
        message: 'Both pets will become available for breeding again.',
        confirmLabel: 'Mark completed'
      });
      if (!ok) return;
    } else if (decision === 'approve_with_conditions') {
      const picked = suggestedConditions(r?.compatibility);

      const answers = await wizard.open({
        title: 'Approve with conditions',
        subtitle: `${pair} • ${id}`,
        submitLabel: 'Approve with conditions',
        reviewIntro: 'These conditions are recorded on the breeding and sent to both owners.',
        steps: [
          {
            title: 'Assessment',
            fields: [{
              type: 'static',
              html: riskReport(r?.compatibility)
            }]
          },
          {
            title: 'Conditions',
            intro: 'Conditions suggested by the assessment are pre-ticked. Add your own below.',
            fields: [
              {
                name: 'picked', label: 'Standard conditions', type: 'checklist',
                options: CONDITION_LIBRARY.map(c => ({ value: c.text, label: c.text })),
                value: CONDITION_LIBRARY.filter(c => picked.has(c.key)).map(c => c.text)
              },
              {
                name: 'extra', label: 'Additional conditions', type: 'lines', rows: 3,
                hint: 'One per line.'
              }
            ],
            validate: (d) => (d.picked.length + d.extra.length)
              ? null
              : 'Select or write at least one condition.'
          },
          {
            title: 'Note',
            fields: [{
              name: 'notes', label: 'Additional note for the owners', type: 'textarea',
              hint: 'Optional.'
            }]
          }
        ]
      });
      if (!answers) return;

      conditions = answers.picked.concat(answers.extra);
      notes = answers.notes || '';
    } else {
      const ok = await wizard.confirm({
        title: 'Approve breeding',
        subtitle: `${pair} • ${id}`,
        message: 'Both pets will be reserved and hidden from the match list, and other open '
               + 'proposals for them will be cancelled.',
        confirmLabel: 'Approve'
      });
      if (!ok) return;
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
