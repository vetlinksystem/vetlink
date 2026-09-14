// Manage Employees — API + working Edit

// =====================
// API ENDPOINTS
// =====================
// Bodies: { id?, firstName, middleName, lastName, dateOfBirth, sex, email, number,
//            street, barangay, city, province, password?, position, isAdmin, status, dateHired }
const API_LIST   = '/employees/get-all';   // GET  → [ {id,name,email,number,position,isAdmin,status?} ]
const API_CREATE = '/employees/add';       // POST → { success, id? }
const API_UPDATE = '/employees/update';    // PUT  → { success }

const fetchJSON = async (url, options = {}, timeoutMs = 15000) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: ctl.signal,
      ...options
    });
    clearTimeout(t);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    clearTimeout(t);
    console.error(e);
    return { ok: false, status: 0, body: { message: e.message } };
  }
};

// =====================
// STATE
// =====================
let EMPLOYEES = [];

// =====================
// DOM
// =====================
const tbody      = document.getElementById('empTbody');
const modal      = document.getElementById('empModal');
const form       = document.getElementById('empForm');
const modalTitle = document.getElementById('empModalTitle');
const addBtn     = document.getElementById('addEmployeeBtn');

const fId     = document.getElementById('empId');
const fLast   = document.getElementById('empLastName');
const fFirst  = document.getElementById('empFirstName');
const fMiddle = document.getElementById('empMiddleName');
const fDob    = document.getElementById('empDateOfBirth');
const fSex    = document.getElementById('empSex');
const fEmail  = document.getElementById('empEmail');
const fNumber = document.getElementById('empPhone');      // number
const fStreet   = document.getElementById('empStreet');
const fBarangay = document.getElementById('empBarangay');
const fCity     = document.getElementById('empCity');
const fProvince = document.getElementById('empProvince');
const fPass   = document.getElementById('empPassword');
const fConfirm= document.getElementById('empConfirm');
const fPos    = document.getElementById('empRole');       // position
const fAdmin  = document.getElementById('empIsAdmin');
const fStatus = document.getElementById('empStatus');     // optional
const fHired  = document.getElementById('empDateHired');
const errBox  = document.getElementById('empFormError');
const pwHint  = document.getElementById('empPwHint');

// Same rule the client registration form enforces.
const passwordMeetsRules = (pw) => {
  const s = String(pw || '');
  return s.length >= 11 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s);
};

// PH mobile: 09XXXXXXXXX / +639XXXXXXXXX / 639XXXXXXXXX
const isValidMobile = (value) => {
  const d = String(value || '').replace(/[^\d+]/g, '');
  return /^09\d{9}$/.test(d) || /^\+639\d{9}$/.test(d) || /^639\d{9}$/.test(d);
};

const showError = (msg) => {
  if (!errBox) { if (msg) alert(msg); return; }
  errBox.textContent = msg || '';
  errBox.hidden = !msg;
};

// Older employee documents hold one flat `name` / `address`; split them so the
// new fields can be edited without losing what is already stored.
const splitName = (full) => {
  const parts = String(full || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (!parts.length) return { firstName:'', middleName:'', lastName:'' };
  if (parts.length === 1) return { firstName: parts[0], middleName:'', lastName:'' };
  if (parts.length === 2) return { firstName: parts[0], middleName:'', lastName: parts[1] };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), lastName: parts[parts.length - 1] };
};

const splitAddress = (address) => {
  const parts = String(address || '').split(',').map(p => p.trim()).filter(Boolean);
  const out = { street:'', barangay:'', city:'', province:'' };
  if (!parts.length) return out;
  if (parts.length >= 4) {
    out.street   = parts.slice(0, parts.length - 3).join(', ');
    out.barangay = parts[parts.length - 3];
    out.city     = parts[parts.length - 2];
    out.province = parts[parts.length - 1];
    return out;
  }
  if (parts.length === 1) { out.city = parts[0]; return out; }
  ['street','barangay','city','province'].slice(4 - parts.length).forEach((k, i) => { out[k] = parts[i]; });
  return out;
};

// =====================
// RENDER TABLE
// =====================
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

const rowHTML = e => `
  <tr>
    <td>${esc(e.id)}</td>
    <td>${esc(e.name)} ${e.isAdmin ? '<span class="badge admin" title="Admin">Admin</span>' : ''}</td>
    <td>${esc(e.email)}</td>
    <td>${esc(e.number || '')}</td>
    <td><span class="badge role">${esc(e.position || '')}</span></td>
    <td>
      <span class="badge status ${
        e.status === 'Active'   ? 'active' :
        e.status === 'On Leave' ? 'leave'  :
        e.status === 'Inactive' ? 'inactive' : ''
      }">${esc(e.status || 'Active')}</span>
    </td>
    <td>
      <div class="row-actions">
        <button class="action" data-edit="${esc(e.id)}">Edit</button>
      </div>
    </td>
  </tr>
`;

const renderTable = list => {
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:12px;color:#667085"><em>No employees found.</em></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(rowHTML).join('');
};

// event delegation for Edit
tbody.addEventListener('click', e => {
  const btn = e.target.closest('button[data-edit]');
  if (!btn) return;
  const id = btn.dataset.edit;            // keep as string
  openEdit(id);
});

// =====================
// MODAL HELPERS
// =====================
const openModal = () => {
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
};
const closeModal = () => {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  form.reset();
  fId.value = '';
  fPass.value = '';
  fConfirm.value = '';
  showError('');
};

document.querySelectorAll('[data-close-modal]').forEach(el =>
  el.addEventListener('click', closeModal)
);

addBtn.addEventListener('click', () => {
  modalTitle.textContent = 'Add Employee';
  form.reset();
  showError('');
  fId.value = '';
  fPos.value = '';
  fSex.value = '';
  fStatus.value = 'Active';
  fAdmin.checked = false;
  if (fDob) fDob.max = new Date().toISOString().slice(0, 10);
  if (fHired) fHired.value = new Date().toISOString().slice(0, 10);
  if (pwHint) {
    pwHint.textContent = 'At least 11 characters, with one uppercase letter, one lowercase letter, one number, and one special character.';
  }
  openModal();
});

const openEdit = id => {
  const emp = EMPLOYEES.find(x => String(x.id) === String(id));
  if (!emp) return;
  modalTitle.textContent = 'Edit Employee';
  showError('');

  const nm = (emp.firstName || emp.lastName)
    ? { firstName: emp.firstName || '', middleName: emp.middleName || '', lastName: emp.lastName || '' }
    : splitName(emp.name);
  const ad = (emp.street || emp.barangay || emp.city || emp.province)
    ? { street: emp.street || '', barangay: emp.barangay || '', city: emp.city || '', province: emp.province || '' }
    : splitAddress(emp.address);

  fId.value       = emp.id;               // can be number or string
  fLast.value     = nm.lastName;
  fFirst.value    = nm.firstName;
  fMiddle.value   = nm.middleName;
  fDob.value      = (emp.dateOfBirth || '').slice(0, 10);
  fSex.value      = emp.sex || '';
  fEmail.value    = emp.email || '';
  fNumber.value   = emp.number || '';
  fStreet.value   = ad.street;
  fBarangay.value = ad.barangay;
  fCity.value     = ad.city;
  fProvince.value = ad.province;
  fHired.value    = (emp.dateHired || '').slice(0, 10);
  fAdmin.checked  = !!emp.isAdmin;
  fPos.value      = emp.position || '';
  fStatus.value   = emp.status || 'Active';

  // Never round-trip the stored password through the browser — blank means "unchanged".
  fPass.value = '';
  fConfirm.value = '';
  if (fDob) fDob.max = new Date().toISOString().slice(0, 10);
  if (pwHint) pwHint.textContent = 'Leave both boxes empty to keep the current password.';

  openModal();
};

// =====================
// CREATE / UPDATE
// =====================
form.addEventListener('submit', async ev => {
  ev.preventDefault();
  showError('');

  const isEdit = !!fId.value;
  const password = fPass.value || '';
  const confirm  = fConfirm.value || '';

  const payload = {
    firstName:   fFirst.value.trim(),
    middleName:  fMiddle.value.trim(),
    lastName:    fLast.value.trim(),
    dateOfBirth: fDob.value || '',
    sex:         fSex.value || '',
    email:       fEmail.value.trim(),
    number:      fNumber.value.trim(),
    street:      fStreet.value.trim(),
    barangay:    fBarangay.value.trim(),
    city:        fCity.value.trim(),
    province:    fProvince.value.trim(),
    position:    fPos.value.trim(),
    isAdmin:     fAdmin.checked,
    status:      fStatus.value,
    dateHired:   fHired.value || ''
  };

  if (!payload.firstName || !payload.lastName) {
    showError('Please enter both the first and last name.'); return;
  }
  if (!payload.email) { showError('Email address is required.'); return; }
  if (!isValidMobile(payload.number)) {
    showError('Please enter a valid PH mobile number (e.g. 09171234567).'); return;
  }
  const missing = [
    [payload.street, 'house/street'], [payload.barangay, 'barangay'],
    [payload.city, 'city/municipality'], [payload.province, 'province']
  ].filter(([v]) => !v).map(([, label]) => label);
  if (missing.length) {
    showError(`Please complete the address — missing: ${missing.join(', ')}.`); return;
  }
  if (!payload.position) { showError('Please choose a role.'); return; }

  if (!isEdit && !password) { showError('A password is required for a new account.'); return; }
  if (password) {
    if (!passwordMeetsRules(password)) {
      showError('Password must have at least 11 characters, one uppercase, one lowercase, one number, and one special character.');
      return;
    }
    if (password !== confirm) { showError('The two passwords do not match.'); return; }
    payload.password = password;
  }

  if (!isEdit) {
    // CREATE
    const { ok, body } = await fetchJSON(API_CREATE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!ok || body?.success === false) {
      showError(body?.message || 'Failed to create employee.');
      return;
    }
    const created = body?.employee || { ...payload, id: body?.id };
    delete created.password;
    EMPLOYEES.unshift(created);
  } else {
    // UPDATE (id in body)
    const id = fId.value;                 // keep as string
    const { ok, body } = await fetchJSON(API_UPDATE, {
      method: 'PUT',
      body: JSON.stringify({ id, ...payload })
    });
    if (!ok || body?.success === false) {
      showError(body?.message || 'Failed to update employee.');
      return;
    }
    // update local list (string compare so '5' vs 5 still matches)
    const saved = body?.employee || payload;
    EMPLOYEES = EMPLOYEES.map(e =>
      String(e.id) === String(id) ? { ...e, ...saved, password: undefined, id: e.id } : e
    );
  }

  renderTable(EMPLOYEES);
  closeModal();
});

// =====================
// INITIAL LOAD
// =====================
const loadEmployees = async () => {
  tbody.innerHTML = `<tr><td colspan="7" style="padding:12px;color:#667085">Loading…</td></tr>`;
  const { ok, body } = await fetchJSON(API_LIST);
  EMPLOYEES = ok && Array.isArray(body) ? body : [];
  renderTable(EMPLOYEES);
};

loadEmployees();
