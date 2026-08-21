// EMPLOYEE — REGISTERED USERS
// Features:
// - List all clients (optionally with pets)
// - Search filter (name/email/contact/address/id)
// - Edit/update client (password optional)
// - Delete client

(function () {
  const API_LIST = '/employee/users/get-all?include=pets&limit=500&offset=0';
  const API_UPDATE = '/employee/users/update'; // PUT
  const API_DELETE = (id) => `/employee/users/delete?id=${encodeURIComponent(id)}`; // DELETE

  const $ = (id) => document.getElementById(id);

  const tbody = $('usersTbody');
  const userSearch = $('userSearch');

  const modal = $('userEditModal');
  const saveBtn = $('saveUserBtn');
  const editId = $('editUserId');
  const editLastName = $('editUserLastName');
  const editFirstName = $('editUserFirstName');
  const editMiddleName = $('editUserMiddleName');
  const editDateOfBirth = $('editUserDateOfBirth');
  const editSex = $('editUserSex');
  const editEmail = $('editUserEmail');
  const editNumber = $('editUserNumber');
  const editAddress = $('editUserAddress');
  const editPassword = $('editUserPassword');

  if (!tbody) return;

  // Names are stored as 1NF fields. Older client documents only have a flat `name`,
  // so split it on read so they can still be edited through this form.
  const splitLegacyName = (fullName) => {
    const parts = String(fullName || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    if (!parts.length) return { firstName: '', middleName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
    if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(' '),
      lastName: parts[parts.length - 1]
    };
  };

  const nameParts = (u = {}) =>
    (u.firstName || u.lastName)
      ? { firstName: u.firstName || '', middleName: u.middleName || '', lastName: u.lastName || '' }
      : splitLegacyName(u.name || u.fullName || '');

  // PH mobile: 09XXXXXXXXX / +639XXXXXXXXX / 639XXXXXXXXX
  const isValidMobile = (value) => {
    const d = String(value || '').replace(/[^\d+]/g, '');
    return /^09\d{9}$/.test(d) || /^\+639\d{9}$/.test(d) || /^639\d{9}$/.test(d);
  };

  // Roles: staff may edit customers, admin may delete them, veterinarians view only.
  // core.js publishes the permission list from the server, which enforces the same rules.
  const can = (p) => !!(window.vetlinkCan && window.vetlinkCan(p));
  const canEdit = () => can('customers.edit');
  const canDelete = () => can('customers.delete');

  const fetchJSON = async (url, options = {}, timeoutMs = 15000) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
        signal: ctl.signal,
        ...options,
      });
      clearTimeout(t);
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body };
    } catch (e) {
      clearTimeout(t);
      return { ok: false, status: 0, body: { message: e.message } };
    }
  };

  const esc = (s) =>
    (s ?? '').toString().replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m]));

  let USERS = [];
  let FILTER = '';

  const rowHTML = (u) => {
    const petsCount = (u.pets?.length || 0);
    return `
      <tr data-userid="${esc(u.id)}">
        <td style="width:48px">
          <button class="row-toggle" aria-expanded="false" aria-controls="expand-${esc(u.id)}" title="Show pets">+</button>
        </td>
        <td>${esc(u.id)}</td>
        <td><a href="/employee/user?id=${encodeURIComponent(u.id)}">${esc(u.name)}</a></td>
        <td>${esc(u.email)}</td>
        <td>${esc(u.number || '')}</td>
        <td>${esc(u.address || '')}</td>
        <td class="cell-actions" style="white-space:nowrap">
          <div class="actions-wrap">
            <a class="btn-xs link" href="/employee/user?id=${encodeURIComponent(u.id)}">View</a>
            ${canEdit() ? `<button type="button" class="btn-xs primary js-edit" data-edit="${esc(u.id)}">Edit</button>` : ''}
            ${canDelete() ? `<button type="button" class="btn-xs danger js-del" data-del="${esc(u.id)}">Delete</button>` : ''}
          </div>
        </td>
      </tr>

      <tr id="expand-${esc(u.id)}" class="expand-row" hidden>
        <td></td>
        <td colspan="6">
          <div class="expand-box" id="expand-box-${esc(u.id)}">
            <strong>Pets (${petsCount}):</strong>
            <div class="pet-list">
              ${(u.pets || []).map(p => `
                <div class="pet-chip">
                  <a href="/employee/pet?id=${encodeURIComponent(p.id)}">
                    <div><b>${esc(p.name)}</b></div>
                    <div>${esc(p.breed || '')} • ${esc(p.species || '')} • ${esc(p.sex || '')} • ${esc(p.age ?? '')}y</div>
                  </a>
                </div>
              `).join('') || '<em>No pets found.</em>'}
            </div>
          </div>
        </td>
      </tr>
    `;
  };

  const wireExpanders = () => {
    tbody.querySelectorAll('.row-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const tr = btn.closest('tr');
        const id = tr?.getAttribute('data-userid');
        const exp = document.getElementById(`expand-${id}`);
        const box = document.getElementById(`expand-box-${id}`);
        if (!exp || !box) return;
        const isHidden = exp.hasAttribute('hidden');

        if (isHidden) {
          exp.removeAttribute('hidden');
          exp.classList.add('open');
          box.style.maxHeight = '0px';
          requestAnimationFrame(() => { box.style.maxHeight = box.scrollHeight + 'px'; });
          btn.setAttribute('aria-expanded', 'true');
          btn.textContent = '−';
        } else {
          box.style.maxHeight = box.scrollHeight + 'px';
          requestAnimationFrame(() => { box.style.maxHeight = '0px'; });
          const onEnd = () => {
            exp.setAttribute('hidden', '');
            exp.classList.remove('open');
            box.removeEventListener('transitionend', onEnd);
          };
          box.addEventListener('transitionend', onEnd);
          btn.setAttribute('aria-expanded', 'false');
          btn.textContent = '+';
        }
      });
    });
  };

  const openModal = (u) => {
    if (!modal) return;
    const parts = nameParts(u);
    editId.value = u.id;
    editLastName.value = parts.lastName;
    editFirstName.value = parts.firstName;
    editMiddleName.value = parts.middleName;
    if (editDateOfBirth) editDateOfBirth.value = u.dateOfBirth || '';
    if (editSex) editSex.value = u.sex || '';
    editEmail.value = u.email || '';
    editNumber.value = u.number || '';
    editAddress.value = u.address || '';
    editPassword.value = '';
    modal.style.display = '';
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  };

  // close handlers
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn && modal && modal.contains(closeBtn)) closeModal();
    if (e.target === modal) closeModal();
  });

  const matchesFilter = (u, q) => {
    if (!q) return true;
    const hay = [u.id, u.name, u.firstName, u.middleName, u.lastName, u.email, u.number, u.address]
      .map(v => String(v || '').toLowerCase())
      .join(' | ');
    return hay.includes(q);
  };

  const render = () => {
    const q = (FILTER || '').trim().toLowerCase();
    const list = USERS.filter(u => matchesFilter(u, q));
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:12px;color:#667085"><em>No users found.</em></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(rowHTML).join('');
    wireExpanders();
  };

  // Edit/Delete actions via event delegation
  tbody.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.js-edit');
    if (editBtn) {
      const id = editBtn.getAttribute('data-edit');
      const u = USERS.find(x => String(x.id) === String(id));
      if (u) openModal(u);
      return;
    }

    const delBtn = e.target.closest('.js-del');
    if (delBtn) {
      const id = delBtn.getAttribute('data-del');
      const u = USERS.find(x => String(x.id) === String(id));
      const name = u?.name || id;
      const ok = confirm(`Delete user "${name}"? This cannot be undone.`);
      if (!ok) return;

      const r = await fetchJSON(API_DELETE(id), { method: 'DELETE' });
      if (!r.ok || r.body?.success === false) {
        alert(r.body?.message || 'Failed to delete user.');
        return;
      }
      USERS = USERS.filter(x => String(x.id) !== String(id));
      render();
      return;
    }
  });

  // Save update
  saveBtn?.addEventListener('click', async () => {
    const payload = {
      id: editId.value,
      lastName: (editLastName.value || '').trim(),
      firstName: (editFirstName.value || '').trim(),
      middleName: (editMiddleName.value || '').trim(),
      dateOfBirth: (editDateOfBirth?.value || '').trim(),
      sex: (editSex?.value || '').trim(),
      email: (editEmail.value || '').trim(),
      number: (editNumber.value || '').trim(),
      address: (editAddress.value || '').trim(),
      password: (editPassword.value || '').trim(),
    };

    if (!payload.id || !payload.firstName || !payload.lastName || !payload.email) {
      alert('ID, First Name, Last Name, and Email are required.');
      return;
    }
    if (!isValidMobile(payload.number)) {
      alert('Please enter a valid contact number (e.g. 09171234567).');
      return;
    }
    if (!payload.address) {
      alert('Complete address is required.');
      return;
    }

    // If password is blank, let backend keep old password
    if (!payload.password) delete payload.password;

    const r = await fetchJSON(API_UPDATE, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!r.ok || r.body?.success === false) {
      alert(r.body?.message || 'Update failed.');
      return;
    }

    // Update local cache (keep the derived display name in sync with the split fields)
    const derivedName = [payload.firstName, payload.middleName, payload.lastName]
      .filter(Boolean).join(' ');
    USERS = USERS.map(u => String(u.id) === String(payload.id)
      ? { ...u, ...payload, name: derivedName }
      : u
    );
    closeModal();
    render();
  });

  userSearch?.addEventListener('input', () => {
    FILTER = userSearch.value || '';
    render();
  });

  // core.js resolves the role asynchronously; re-render once it lands so Edit/Delete
  // are drawn (or withheld) according to the real permission list.
  document.addEventListener('vetlink:role-ready', () => {
    if (USERS.length) render();
  });

  const loadUsers = async () => {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:12px;color:#667085">Loading…</td></tr>`;
    const { ok, body } = await fetchJSON(API_LIST);
    const items = ok ? (body.items || body || []) : [];
    USERS = Array.isArray(items) ? items : [];
    render();
  };

  loadUsers();
})();
