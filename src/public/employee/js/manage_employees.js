// Manage Employees — API + working Edit

// =====================
// API ENDPOINTS
// =====================
// Bodies: { id?, name, email, number, password?, position, isAdmin }
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
const fName   = document.getElementById('empName');
const fEmail  = document.getElementById('empEmail');
const fNumber = document.getElementById('empPhone');      // number
const fPass   = document.getElementById('empPassword');
const fPos    = document.getElementById('empRole');       // position
const fAdmin  = document.getElementById('empIsAdmin');
const fStatus = document.getElementById('empStatus');     // optional

// =====================
// RENDER TABLE
// =====================
const rowHTML = e => `
  <tr>
    <td>${e.id}</td>
    <td>${e.name} ${e.isAdmin ? '<span class="badge admin" title="Admin">Admin</span>' : ''}</td>
    <td>${e.email}</td>
    <td>${e.number || ''}</td>
    <td><span class="badge role">${e.position || ''}</span></td>
    <td>
      <span class="badge status ${
        e.status === 'Active'   ? 'active' :
        e.status === 'On Leave' ? 'leave'  :
        e.status === 'Inactive' ? 'inactive' : ''
      }">${e.status || 'Active'}</span>
    </td>
    <td>
      <div class="row-actions">
        <button class="action" data-edit="${e.id}">Edit</button>
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
};

document.querySelectorAll('[data-close-modal]').forEach(el =>
  el.addEventListener('click', closeModal)
);

addBtn.addEventListener('click', () => {
  modalTitle.textContent = 'Add Employee';
  form.reset();
  fId.value = '';
  fPos.value = '';
  fStatus.value = 'Active';
  fAdmin.checked = false;
  openModal();
});

const openEdit = id => {
  const emp = EMPLOYEES.find(x => String(x.id) === String(id));
  if (!emp) return;
  modalTitle.textContent = 'Edit Employee';
  fId.value     = emp.id;                 // can be number or string
  fName.value   = emp.name || '';
  fEmail.value  = emp.email || '';
  fNumber.value = emp.number || '';
  fPass.value   = emp.password || '';
  fAdmin.checked = !!emp.isAdmin;
  fPos.value    = emp.position || '';
  fStatus.value = emp.status || 'Active';
  openModal();
};

// =====================
// CREATE / UPDATE
// =====================
form.addEventListener('submit', async ev => {
  ev.preventDefault();

  const payload = {
    name:     fName.value.trim(),
    email:    fEmail.value.trim(),
    number:   fNumber.value.trim(),
    password: fPass.value || undefined,
    position: fPos.value.trim(),
    isAdmin:  fAdmin.checked,
    status:   fStatus.value
  };

  if (!payload.name || !payload.email || !payload.number) {
    alert('Please complete name, email, and contact number.');
    return;
  }

  if (!fId.value) {
    // CREATE
    const { ok, body } = await fetchJSON(API_CREATE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!ok) {
      alert('Failed to create employee');
      return;
    }
    const newId = body?.id ?? body?.employeeId ?? Date.now();
    const created = { ...payload, id: newId };
    EMPLOYEES.unshift(created);
  } else {
    // UPDATE (id in body)
    const id = fId.value;                 // keep as string
    const { ok } = await fetchJSON(API_UPDATE, {
      method: 'PUT',
      body: JSON.stringify({ id, ...payload })
    });
    if (!ok) {
      alert('Failed to update employee');
      return;
    }
    // update local list (string compare so '5' vs 5 still matches)
    EMPLOYEES = EMPLOYEES.map(e =>
      String(e.id) === String(id) ? { ...e, ...payload, id: e.id } : e
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
