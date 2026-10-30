/* src/public/employee/js/record_fields.js
 * Type-specific inputs for a medical record, shared by the Pet Records page and the
 * Pet Details page so both ask for the same details (vaccine name, batch no., …).
 * The vocabularies come from GET /catalogs/medical; the server re-validates everything
 * in utilities/recordDetails.js.
 *
 *   container.innerHTML = vetlinkRecordFields.build('vaccination', catalog);
 *   vetlinkRecordFields.appendTo(formData, container);
 */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const field = (name, label, opts = {}) => {
    const { type = 'text', list = null, full = false, placeholder = '', required = false, step = null } = opts;
    const cls = `rx-field${full ? ' rx-full' : ''}`;
    const req = required ? ' <b class="req">*</b>' : '';

    if (list) {
      return `<label class="${cls}">
        <span>${esc(label)}${req}</span>
        <select class="input" name="${esc(name)}" ${required ? 'required' : ''}>
          <option value="">Select…</option>
          ${list.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
        </select>
      </label>`;
    }
    if (type === 'textarea') {
      return `<label class="${cls}">
        <span>${esc(label)}${req}</span>
        <textarea class="input" name="${esc(name)}" rows="2" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}></textarea>
      </label>`;
    }
    return `<label class="${cls}">
      <span>${esc(label)}${req}</span>
      <input class="input" type="${esc(type)}" name="${esc(name)}" placeholder="${esc(placeholder)}"
             ${step ? `step="${esc(step)}"` : ''} ${required ? 'required' : ''}/>
    </label>`;
  };

  const checkGroup = (name, label, list, required = false) => `
    <div class="rx-checkgroup">
      <span>${esc(label)}${required ? ' <b class="req">*</b>' : ''}</span>
      <div class="rx-checks">
        ${list.map(o => `<label><input type="checkbox" name="${esc(name)}" value="${esc(o)}"/> ${esc(o)}</label>`).join('')}
      </div>
    </div>`;

  /** Markup for the inputs of one record type ('' when no type is chosen). */
  const build = (recordType, catalog) => {
    if (!recordType || !catalog) return '';
    const c = catalog;

    switch (recordType) {
      case 'grooming':
        return checkGroup('groomingTypes', 'Grooming services', c.groomingTypes || [], true)
             + field('serviceDetails', 'Service details', { type: 'textarea', full: true })
             + field('productsUsed', 'Products used', { placeholder: 'e.g. Shampoo, conditioner' })
             + field('nextAppointment', 'Next appointment', { type: 'date' });

      case 'vaccination':
        return field('vaccineName', 'Vaccine name', { required: true })
             + field('vaccineType', 'Vaccine type', { list: c.vaccineTypes || [] })
             + field('manufacturer', 'Manufacturer')
             + field('batchNo', 'Batch / Lot no.', { placeholder: 'e.g. A12345' })
             + field('route', 'Route', { list: c.vaccineRoutes || [] })
             + field('siteOfInjection', 'Site of injection', { placeholder: 'e.g. Left shoulder' })
             + field('dateGiven', 'Date given', { type: 'date' })
             + field('nextDueDate', 'Next due date', { type: 'date' });

      case 'checkup':
        return field('reasonForVisit', 'Reason for visit', { list: c.visitReasons || [], required: true })
             + field('bodyWeight', 'Body weight (kg)', { type: 'number', step: '0.1' })
             + field('temperature', 'Temperature (°C)', { type: 'number', step: '0.1' })
             + field('heartRate', 'Heart rate (bpm)', { type: 'number' })
             + field('findings', 'Findings / diagnosis', { type: 'textarea', full: true, required: true })
             + field('treatment', 'Treatment / recommendation', { type: 'textarea', full: true });

      case 'general_checkup': {
        const areas = c.screeningAreas || [];
        return field('bodyCondition', 'Body condition', { list: c.bodyConditions || [], required: true })
             + field('hydrationStatus', 'Hydration status', { list: c.hydrationStatuses || [] })
             + `<div class="rx-screening">
                  <span>Health screening</span>
                  <div class="rx-screening-grid">
                    ${areas.map(a => `
                      <label class="rx-field">
                        <span>${esc(a)}</span>
                        <select class="input" name="screening_${esc(a)}">
                          <option value="">Select…</option>
                          ${(c.screeningResults || []).map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
                        </select>
                      </label>`).join('')}
                  </div>
                </div>`
             + field('others', 'Others', { full: true })
             + field('overallAssessment', 'Overall assessment', { list: c.overallAssessments || [], required: true });
      }

      case 'surgery':
        return field('procedure', 'Surgery / procedure', { list: c.surgeryProcedures || [], required: true })
             + checkGroup('anesthesiaTypes', 'Anaesthesia type', c.anesthesiaTypes || [])
             + field('surgeon', 'Surgeon', { required: true })
             + field('assistant', 'Assistant')
             + field('startTime', 'Start time', { type: 'time' })
             + field('endTime', 'End time', { type: 'time' })
             + field('preOperativeDiagnosis', 'Pre-operative diagnosis', { type: 'textarea', full: true })
             + field('postOperativeDiagnosis', 'Post-operative diagnosis', { type: 'textarea', full: true })
             + field('outcome', 'Outcome', { list: c.surgeryOutcomes || [], required: true })
             + field('medicationsGiven', 'Medications given', { type: 'textarea', full: true });

      default:
        return '';
    }
  };

  /**
   * Copy the filled-in type-specific inputs into a FormData. Checkbox groups go in as
   * repeated values, which the server normalizes back into an array.
   */
  const appendTo = (fd, container) => {
    container.querySelectorAll('input, select, textarea').forEach((el) => {
      if (!el.name) return;
      if (el.type === 'checkbox') {
        if (el.checked) fd.append(el.name, el.value);
        return;
      }
      if (String(el.value).trim() !== '') fd.append(el.name, el.value);
    });
  };

  window.vetlinkRecordFields = { build, appendTo };
})();
