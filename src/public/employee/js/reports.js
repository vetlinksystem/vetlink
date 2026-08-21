// employee/js/reports.js — Clinic Reports.
// The report is generated server-side from the live collections, so this page only
// picks a period, renders the result, and offers CSV/print. It generates itself on
// load: no button press is needed to see the current month.
(() => {
  'use strict';

  const API = '/employee/reports/data';

  const $ = (id) => document.getElementById(id);

  const presetsEl = $('rpPresets');
  const fromEl = $('rpFrom');
  const toEl = $('rpTo');
  const applyEl = $('rpApply');
  const bodyEl = $('rpBody');
  const statusEl = $('rpStatus');
  const subtitleEl = $('rpSubtitle');
  const exportEl = $('rpExport');
  const printEl = $('rpPrint');

  let current = null;         // last generated report
  let currentPreset = 'this-month';

  // ===== Helpers =====
  const esc = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const setStatus = (msg, type = 'info') => {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.className = 'rp-status' + (type === 'error' ? ' error' : '') + (msg ? '' : ' hidden');
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtDateTime = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  // ===== Renderers =====
  const kpi = (value, label) =>
    `<div class="rp-kpi"><div class="v">${esc(value)}</div><div class="l">${esc(label)}</div></div>`;

  /** Rows of { label, count, percent } as a table with a proportion bar. */
  const breakdownTable = (rows, labelHead = 'Category') => {
    if (!rows || !rows.length) return '<p class="rp-empty">Nothing recorded for this period.</p>';
    return `
      <div class="rp-table-wrap">
        <table class="rp-table">
          <thead>
            <tr><th>${esc(labelHead)}</th><th class="num">Count</th><th class="num">Share</th></tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>
                  ${esc(r.label)}
                  <span class="rp-bar"><i style="width:${Math.max(0, Math.min(100, r.percent))}%"></i></span>
                </td>
                <td class="num">${esc(r.count)}</td>
                <td class="num">${esc(r.percent)}%</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  const section = (title, tag, inner) => `
    <div class="rp-section">
      <h2>${esc(title)}${tag ? ` <span class="tag">${esc(tag)}</span>` : ''}</h2>
      ${inner}
    </div>`;

  const renderTrend = (trend) => {
    if (!trend || !trend.length) return '<p class="rp-empty">No activity recorded in this period.</p>';
    return `
      <div class="rp-table-wrap">
        <table class="rp-table">
          <thead>
            <tr>
              <th>Month</th>
              <th class="num">Appointments</th>
              <th class="num">New pets</th>
              <th class="num">New customers</th>
              <th class="num">Records</th>
            </tr>
          </thead>
          <tbody>
            ${trend.map(m => `
              <tr>
                <td>${esc(m.label)}</td>
                <td class="num">${esc(m.appointments)}</td>
                <td class="num">${esc(m.pets)}</td>
                <td class="num">${esc(m.clients)}</td>
                <td class="num">${esc(m.records)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  const renderReasons = (reasons) => {
    if (!reasons || !reasons.length) {
      return '<p class="rp-empty">No cancellations with a recorded reason in this period.</p>';
    }
    return `
      <div class="rp-table-wrap">
        <table class="rp-table">
          <thead><tr><th>Date</th><th>Type</th><th>Reason given</th></tr></thead>
          <tbody>
            ${reasons.map(r => `
              <tr>
                <td>${esc(fmtDate(r.date))}</td>
                <td>${esc(r.reasonType)}</td>
                <td>${esc(r.reason)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  const render = (report) => {
    const o = report.overview;

    subtitleEl.textContent =
      `${fmtDate(report.period.from)} – ${fmtDate(report.period.to)} · generated ${fmtDateTime(report.generatedAt)}`;

    bodyEl.innerHTML = `
      <div class="rp-kpis">
        ${kpi(o.appointments, 'Appointments')}
        ${kpi(o.newClients, 'New Customers')}
        ${kpi(o.newPets, 'New Pets')}
        ${kpi(o.medicalRecords, 'Medical Records')}
        ${kpi(o.breedingRequests, 'Breeding Requests')}
        ${kpi(`${o.completionRate}%`, 'Completion Rate')}
      </div>

      ${section('Appointments', `${report.appointments.total} total`, `
        <div class="rp-grid">
          <div>
            <h3 class="rp-empty" style="font-style:normal;font-weight:700;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 .4rem">By status</h3>
            ${breakdownTable(report.appointments.byStatus, 'Status')}
          </div>
          <div>
            <h3 class="rp-empty" style="font-style:normal;font-weight:700;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 .4rem">By purpose</h3>
            ${breakdownTable(report.appointments.byPurpose, 'Purpose')}
          </div>
        </div>`)}

      ${section('Cancellations', `${report.appointments.cancellationRate}% of appointments`,
        renderReasons(report.appointments.cancellationReasons))}

      ${section('Registrations', `${report.registrations.newPets} pets · ${report.registrations.newClients} customers`, `
        <div class="rp-grid">
          <div>
            <h3 class="rp-empty" style="font-style:normal;font-weight:700;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 .4rem">Pets by breed</h3>
            ${breakdownTable(report.registrations.petsByBreed, 'Breed')}
          </div>
          <div>
            <h3 class="rp-empty" style="font-style:normal;font-weight:700;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 .4rem">Pets by sex</h3>
            ${breakdownTable(report.registrations.petsBySex, 'Sex')}
          </div>
        </div>`)}

      ${section('Medical Records', `${report.medicalRecords.petsSeen} pets seen`,
        breakdownTable(report.medicalRecords.byType, 'Record type'))}

      ${section('Breeding', `${report.breeding.approved} of ${report.breeding.total} approved`,
        breakdownTable(report.breeding.byStatus, 'Status'))}

      ${section('Monthly Trend', '', renderTrend(report.trend))}
    `;
  };

  // ===== Load =====
  const load = async (params) => {
    setStatus('Generating report…');
    bodyEl.setAttribute('aria-busy', 'true');
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API}?${qs}`, { credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success) {
        setStatus(body.message || `Could not generate the report (HTTP ${res.status}).`, 'error');
        return;
      }

      current = body.report;
      render(current);
      setStatus('');
    } catch (e) {
      setStatus(`Could not reach the server: ${e.message}`, 'error');
    } finally {
      bodyEl.removeAttribute('aria-busy');
    }
  };

  // ===== CSV export =====
  const toCSV = (report) => {
    const rows = [];
    const esc2 = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const push = (...cells) => rows.push(cells.map(esc2).join(','));

    push('VetLink Clinic Report');
    push('Period', `${report.period.from} to ${report.period.to}`);
    push('Generated', report.generatedAt);
    push('');

    push('OVERVIEW');
    push('Metric', 'Value');
    push('Appointments', report.overview.appointments);
    push('New customers', report.overview.newClients);
    push('New pets', report.overview.newPets);
    push('Medical records', report.overview.medicalRecords);
    push('Breeding requests', report.overview.breedingRequests);
    push('Completion rate (%)', report.overview.completionRate);
    push('Cancellation rate (%)', report.overview.cancellationRate);
    push('');

    const block = (title, head, list) => {
      push(title);
      push(head, 'Count', 'Share (%)');
      (list || []).forEach(r => push(r.label, r.count, r.percent));
      push('');
    };

    block('APPOINTMENTS BY STATUS', 'Status', report.appointments.byStatus);
    block('APPOINTMENTS BY PURPOSE', 'Purpose', report.appointments.byPurpose);
    block('PETS BY BREED', 'Breed', report.registrations.petsByBreed);
    block('PETS BY SEX', 'Sex', report.registrations.petsBySex);
    block('PETS BY SPECIES', 'Species', report.registrations.petsBySpecies);
    block('MEDICAL RECORDS BY TYPE', 'Type', report.medicalRecords.byType);
    block('BREEDING BY STATUS', 'Status', report.breeding.byStatus);

    push('CANCELLATION REASONS');
    push('Date', 'Type', 'Reason');
    (report.appointments.cancellationReasons || []).forEach(r => push(r.date, r.reasonType, r.reason));
    push('');

    push('MONTHLY TREND');
    push('Month', 'Appointments', 'New pets', 'New customers', 'Records');
    (report.trend || []).forEach(m => push(m.label, m.appointments, m.pets, m.clients, m.records));

    return rows.join('\r\n');
  };

  const downloadCSV = () => {
    if (!current) return;
    // BOM so Excel opens the UTF-8 correctly.
    const blob = new Blob(['﻿' + toCSV(current)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vetlink-report_${current.period.from}_to_${current.period.to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ===== Wiring =====
  presetsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    presetsEl.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b === btn));
    currentPreset = btn.dataset.preset;
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
    load({ preset: currentPreset });
  });

  applyEl?.addEventListener('click', () => {
    const from = fromEl?.value;
    const to = toEl?.value;
    if (!from || !to) {
      setStatus('Pick both a start and an end date, or choose a preset above.', 'error');
      return;
    }
    if (from > to) {
      setStatus('The start date must not be after the end date.', 'error');
      return;
    }
    presetsEl?.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    load({ from, to });
  });

  exportEl?.addEventListener('click', downloadCSV);
  printEl?.addEventListener('click', () => window.print());

  // Generate on load — the report is available without any interaction.
  load({ preset: currentPreset });
})();
