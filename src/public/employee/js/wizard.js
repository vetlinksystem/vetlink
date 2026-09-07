/* src/public/employee/js/wizard.js
 * Shared step-by-step dialog for the employee side.
 *
 * Why this exists: the multi-answer clinical flows (final health examination, breeding
 * record, monitoring, offspring, approval conditions) were each a chain of native
 * confirm()/prompt() boxes. That leaks the "vetlink-9x1g.onrender.com says" chrome,
 * gives no back button, loses everything typed if one box is cancelled, and cannot
 * validate. This replaces them with one real dialog that shows numbered steps
 * (1 — 2 — 3 …) and a final review of every answer before it is saved.
 *
 * Usage:
 *   const data = await vetlinkWizard.open({
 *     title: 'Final health examination',
 *     subtitle: 'Mel × Cas',
 *     submitLabel: 'Save examination',
 *     steps: [
 *       { title: 'Sire', fields: [{ name:'aFit', label:'Is Mel fit to breed?', type:'radio',
 *                                   options:[{value:'yes',label:'Fit'},{value:'no',label:'Not fit'}],
 *                                   value:'yes', required:true }] }
 *     ]
 *   });
 *   if (!data) return;              // cancelled
 *
 * Resolves with a plain object of field values, or null if the user cancelled.
 *
 * Field types: text, textarea, number, date, select, radio, checkbox, checklist, lines, static.
 *  - `lines`     — a textarea whose value is returned as an array of trimmed, non-empty lines.
 *  - `checklist` — several checkboxes; the value is an array of the checked option values.
 *  - `static`    — read-only markup (`html`), carries no value.
 * Optional per-field `showIf(data)` hides a field until earlier answers make it relevant.
 * A review step listing every answer is appended unless `review: false`.
 */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));

  const VALUE_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'radio', 'checkbox', 'checklist', 'lines'];

  /** Fields the current answers actually make relevant. */
  const visibleFields = (step, data) =>
    (step.fields || []).filter(f => typeof f.showIf !== 'function' || f.showIf(data));

  const initialValue = (f) => {
    if (f.type === 'checkbox') return !!f.value;
    if (f.type === 'checklist') return Array.isArray(f.value) ? f.value.slice() : [];
    if (f.type === 'lines') return Array.isArray(f.value) ? f.value.slice() : [];
    return f.value ?? '';
  };

  const isEmpty = (v) =>
    v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || v === false;

  /** How an answer reads on the review step. */
  const displayValue = (f, v) => {
    if (f.type === 'checkbox') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.length ? v.join(' • ') : '—';
    if ((f.type === 'select' || f.type === 'radio') && Array.isArray(f.options)) {
      const hit = f.options.find(o => String(o.value) === String(v));
      if (hit) return hit.label;
    }
    return String(v ?? '').trim() || '—';
  };

  const fieldControl = (f, value, idx) => {
    const id = `vwz-f${idx}`;
    switch (f.type) {
      case 'textarea':
        return `<textarea id="${id}" class="vwz-input" data-name="${esc(f.name)}" rows="${f.rows || 4}"
                  placeholder="${esc(f.placeholder || '')}">${esc(value)}</textarea>`;
      case 'lines':
        return `<textarea id="${id}" class="vwz-input" data-name="${esc(f.name)}" data-lines="1" rows="${f.rows || 5}"
                  placeholder="${esc(f.placeholder || '')}">${esc((value || []).join('\n'))}</textarea>`;
      case 'select':
        return `<select id="${id}" class="vwz-input" data-name="${esc(f.name)}">
                  ${(f.options || []).map(o =>
                    `<option value="${esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${esc(o.label)}</option>`
                  ).join('')}
                </select>`;
      case 'radio':
        return `<div class="vwz-choices" role="radiogroup" aria-labelledby="${id}-lbl">
                  ${(f.options || []).map((o, i) => `
                    <label class="vwz-choice${String(o.value) === String(value) ? ' on' : ''}">
                      <input type="radio" name="${esc(f.name)}" data-name="${esc(f.name)}" value="${esc(o.value)}"
                             ${String(o.value) === String(value) ? 'checked' : ''}/>
                      <span class="vwz-choice-text">
                        <strong>${esc(o.label)}</strong>
                        ${o.hint ? `<small>${esc(o.hint)}</small>` : ''}
                      </span>
                    </label>`).join('')}
                </div>`;
      case 'checklist':
        return `<div class="vwz-checklist">
                  ${(f.options || []).map(o => `
                    <label class="vwz-check">
                      <input type="checkbox" data-name="${esc(f.name)}" data-multi="1" value="${esc(o.value)}"
                             ${(value || []).some(v => String(v) === String(o.value)) ? 'checked' : ''}/>
                      <span>${esc(o.label)}</span>
                    </label>`).join('')}
                </div>`;
      case 'checkbox':
        return `<label class="vwz-check">
                  <input type="checkbox" id="${id}" data-name="${esc(f.name)}" ${value ? 'checked' : ''}/>
                  <span>${esc(f.checkboxLabel || f.label)}</span>
                </label>`;
      default: {
        const attrs = [
          f.type === 'number' ? 'type="number"' : f.type === 'date' ? 'type="date"' : 'type="text"',
          f.min !== undefined ? `min="${esc(f.min)}"` : '',
          f.max !== undefined ? `max="${esc(f.max)}"` : '',
          f.step !== undefined ? `step="${esc(f.step)}"` : ''
        ].filter(Boolean).join(' ');
        return `<input ${attrs} id="${id}" class="vwz-input" data-name="${esc(f.name)}"
                  value="${esc(value)}" placeholder="${esc(f.placeholder || '')}"/>`;
      }
    }
  };

  // Short inputs sit two-per-row; anything wide takes the whole row. A field can force
  // either with `span: 'full' | 'half'`.
  const HALF_WIDTH_TYPES = ['text', 'number', 'date', 'select'];

  const fieldSpan = (f, solo) => {
    if (f.span === 'full') return ' vwz-field--full';
    if (f.span === 'half') return '';
    // A step with a single question centres badly against an empty second column.
    if (solo) return ' vwz-field--full';
    return HALF_WIDTH_TYPES.includes(f.type) ? '' : ' vwz-field--full';
  };

  const fieldBlock = (f, value, idx, solo) => {
    if (f.type === 'static') return `<div class="vwz-static">${f.html || ''}</div>`;
    const labelled = f.type !== 'checkbox';
    return `
      <div class="vwz-field${fieldSpan(f, solo)}">
        ${labelled ? `<label id="vwz-f${idx}-lbl" class="vwz-label" for="vwz-f${idx}">
            ${esc(f.label)}${f.required ? ' <b class="vwz-req">*</b>' : ''}
          </label>` : ''}
        ${fieldControl(f, value, idx)}
        ${f.hint ? `<p class="vwz-hint">${esc(f.hint)}</p>` : ''}
      </div>`;
  };

  const open = (config = {}) => new Promise((resolve) => {
    const baseSteps = (config.steps || []).filter(Boolean);
    const withReview = config.review !== false;
    const steps = withReview
      ? baseSteps.concat([{ title: config.reviewTitle || 'Review', review: true }])
      : baseSteps;

    // Seed every answer up front so showIf() and the review step can read them all.
    const data = {};
    baseSteps.forEach(s => (s.fields || []).forEach(f => {
      if (VALUE_TYPES.includes(f.type)) data[f.name] = initialValue(f);
    }));

    let current = 0;

    // A one-step dialog has no sequence to hold a steady shape for, so it sizes to its
    // own content instead of reserving the fixed multi-step body.
    const root = document.createElement('div');
    root.className = `modal vwz show${steps.length > 1 ? '' : ' vwz--compact'}`;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = `
      <div class="modal-backdrop" data-vwz-cancel></div>
      <div class="modal-card vwz-card">
        <div class="modal-head">
          <div>
            <h2 class="vwz-title"></h2>
            ${config.subtitle ? `<p class="vwz-subtitle">${esc(config.subtitle)}</p>` : ''}
          </div>
          <button type="button" class="modal-close" data-vwz-cancel aria-label="Close">✕</button>
        </div>
        <ol class="vwz-steps"></ol>
        <form class="modal-body vwz-body" novalidate></form>
        <p class="vwz-error" hidden></p>
        <div class="modal-actions vwz-actions">
          <button type="button" class="btn-ghost" data-vwz-cancel>Cancel</button>
          <button type="button" class="btn-ghost" data-vwz-back>← Back</button>
          <button type="button" class="btn-primary" data-vwz-next>Next →</button>
        </div>
      </div>`;

    const titleEl = root.querySelector('.vwz-title');
    const stepsEl = root.querySelector('.vwz-steps');
    const bodyEl = root.querySelector('.vwz-body');
    const errorEl = root.querySelector('.vwz-error');
    const backBtn = root.querySelector('[data-vwz-back]');
    const nextBtn = root.querySelector('[data-vwz-next]');

    const close = (result) => {
      document.removeEventListener('keydown', onKey, true);
      root.remove();
      if (!document.querySelector('.modal.show')) document.body.classList.remove('modal-open');
      resolve(result);
    };

    // A one-step dialog (a plain confirm) has no sequence to show, so the rail is
    // hidden rather than rendering a lone "1".
    const showRail = steps.length > 1;

    const renderSteps = () => {
      if (!showRail) { stepsEl.hidden = true; return; }
      stepsEl.innerHTML = steps.map((s, i) => `
        <li class="vwz-step${i === current ? ' on' : ''}${i < current ? ' done' : ''}">
          <span class="vwz-step-no">${i < current ? '✓' : i + 1}</span>
          <span class="vwz-step-label">${esc(s.title || `Step ${i + 1}`)}</span>
        </li>`).join('');
    };

    const reviewBody = () => {
      const rows = [];
      baseSteps.forEach(s => {
        const fields = visibleFields(s, data).filter(f => VALUE_TYPES.includes(f.type));
        if (!fields.length) return;
        rows.push(`<h3 class="vwz-review-head">${esc(s.title || '')}</h3>`);
        rows.push('<dl class="vwz-review">' + fields.map(f => `
          <div class="vwz-review-row">
            <dt>${esc(f.label)}</dt>
            <dd>${esc(displayValue(f, data[f.name]))}</dd>
          </div>`).join('') + '</dl>');
      });
      return `
        <p class="vwz-review-intro">${esc(config.reviewIntro || 'Check the details below, then save.')}</p>
        ${rows.join('') || '<p class="vwz-hint">Nothing to review.</p>'}`;
    };

    const render = () => {
      const step = steps[current];
      titleEl.textContent = config.title || 'Details';
      renderSteps();
      errorEl.hidden = true;

      const fields = step.review ? [] : visibleFields(step, data);
      const solo = fields.filter(f => f.type !== 'static').length === 1;

      bodyEl.innerHTML = step.review
        ? reviewBody()
        : `${step.intro ? `<p class="vwz-intro">${esc(step.intro)}</p>` : ''}
           ${fields.map((f, i) => fieldBlock(f, data[f.name], i, solo)).join('')}`;

      backBtn.hidden = current === 0;
      nextBtn.textContent = current === steps.length - 1
        ? (config.submitLabel || 'Save')
        : 'Next →';

      // Focus a field the user actually types into. Focusing a date input selects its
      // first segment, which reads as an error state on a freshly opened dialog.
      bodyEl.querySelector('input[type="text"], input[type="number"], textarea')?.focus();
    };

    /** Pull the visible controls of the current step back into `data`. */
    const collect = () => {
      const step = steps[current];
      if (step.review) return;
      visibleFields(step, data).forEach(f => {
        if (!VALUE_TYPES.includes(f.type)) return;
        if (f.type === 'checklist') {
          data[f.name] = Array.from(bodyEl.querySelectorAll(`[data-name="${f.name}"][data-multi]`))
            .filter(el => el.checked).map(el => el.value);
          return;
        }
        if (f.type === 'checkbox') {
          data[f.name] = !!bodyEl.querySelector(`[data-name="${f.name}"]`)?.checked;
          return;
        }
        if (f.type === 'radio') {
          const hit = bodyEl.querySelector(`[data-name="${f.name}"]:checked`);
          data[f.name] = hit ? hit.value : '';
          return;
        }
        const el = bodyEl.querySelector(`[data-name="${f.name}"]`);
        if (!el) return;
        data[f.name] = f.type === 'lines'
          ? el.value.split('\n').map(s => s.trim()).filter(Boolean)
          : el.value;
      });
    };

    const validate = () => {
      const step = steps[current];
      if (step.review) return null;
      for (const f of visibleFields(step, data)) {
        if (f.required && isEmpty(data[f.name])) {
          return f.requiredMessage || `${f.label} is required.`;
        }
        if (typeof f.validate === 'function') {
          const msg = f.validate(data[f.name], data);
          if (msg) return msg;
        }
      }
      return typeof step.validate === 'function' ? step.validate(data) : null;
    };

    const fail = (msg) => { errorEl.textContent = msg; errorEl.hidden = false; };

    nextBtn.addEventListener('click', async () => {
      collect();
      const msg = validate();
      if (msg) return fail(msg);

      if (current < steps.length - 1) { current += 1; render(); return; }

      // Final step — hand the answers back.
      nextBtn.disabled = true;
      try {
        if (typeof config.onSubmit === 'function') {
          const res = await config.onSubmit(data);
          if (res === false) { nextBtn.disabled = false; return; }   // handler rejected it
          if (typeof res === 'string') { nextBtn.disabled = false; return fail(res); }
        }
        close(data);
      } catch (err) {
        nextBtn.disabled = false;
        fail(err?.message || 'Something went wrong.');
      }
    });

    backBtn.addEventListener('click', () => {
      collect();
      if (current > 0) { current -= 1; render(); }
    });

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-vwz-cancel]')) close(null);
    });

    // Re-render on change so showIf() fields appear/disappear as answers are given,
    // and so a radio's selected card highlights immediately.
    root.addEventListener('change', (e) => {
      if (!e.target.matches('input, select, textarea')) return;
      collect();
      const step = steps[current];
      const conditional = !step.review && (step.fields || []).some(f => typeof f.showIf === 'function');
      if (conditional) render();
      else if (e.target.type === 'radio') {
        bodyEl.querySelectorAll('.vwz-choice').forEach(l =>
          l.classList.toggle('on', !!l.querySelector('input')?.checked));
      }
    });

    // Enter advances, except inside a textarea where it should still make a new line.
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        nextBtn.click();
      }
    });

    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(root);
    document.body.classList.add('modal-open');
    render();
  });

  /** A one-question yes/no dialog, so confirm() is never needed either. */
  const confirmDialog = ({ title, subtitle, message, confirmLabel = 'Confirm', danger = false }) =>
    open({
      title: title || 'Please confirm',
      subtitle,
      review: false,
      submitLabel: confirmLabel,
      steps: [{
        title: 'Confirm',
        fields: [{ type: 'static', html: `<p class="vwz-confirm${danger ? ' danger' : ''}">${esc(message)}</p>` }]
      }]
    }).then(res => res !== null);

  window.vetlinkWizard = { open, confirm: confirmDialog };
})();
