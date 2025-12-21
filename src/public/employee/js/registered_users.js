/* ===========================================================
   📡 API: GET /clients/get_all?include=pets&limit=50&offset=0
   Method: GET
   Response (recommended):
   {
     "items": [
       {
         "id": 1,
         "name": "Full Name",
         "address": "City, Province",
         "email": "user@example.com",
         "number": "09XX-XXX-XXXX",
         "pets": [
           { "id":101,"name":"Buddy","breed":"Golden Retriever","species":"Dog","sex":"Male","age":2 }
         ]
       }
     ],
     "nextOffset": null | number
   }
   =========================================================== */

// =====================
// CONFIG
// =====================
const API_USERS_WITH_PETS = '/employee/users/get-all?include=pets&limit=50&offset=0';

// --- fetch helper (used for API) ---
const fetchJSON = async (url, timeoutMs = 15000) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
      signal: ctl.signal
    });
    clearTimeout(t);
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, status: 0, body: { message: err.message } };
  }
};

// =====================
// OPTIONAL DUMMY DATA (fallback only)
// =====================
const DUMMY_RESPONSE = {
  items: [
    {
      id: 1,
      name: "Ken Lloyd Billones",
      address: "Tagum City, Davao del Norte",
      email: "kenlloyd@example.com",
      number: "0917-123-4567",
      pets: [
        { id: 101, name: "Buddy",  breed: "Golden Retriever", species: "Dog",  sex: "Male", age: 2 },
        { id: 104, name: "Rex",    breed: "German Shepherd",  species: "Dog",  sex: "Male", age: 5 }
      ]
    }
    // ... etc (optional)
  ],
  nextOffset: null
};

// =====================
// RENDERING
// =====================
const tbody = document.getElementById('usersTbody');

const rowHTML = (u) => `
  <tr data-userid="${u.id}">
    <td style="width:48px">
      <button class="row-toggle" aria-expanded="false" aria-controls="expand-${u.id}" title="Show pets">+</button>
    </td>
    <td>${u.id}</td>
    <td><a href="/employee/user?id=${u.id}">${u.name}</a></td>
    <td>${u.email}</td>
    <td>${u.number}</td>
    <td>${u.address}</td>
    <td class="cell-actions">
      <a href="/employee/user?id=${u.id}">View</a>
    </td>
  </tr>

  <!-- EXPANDABLE ROW -->
  <tr id="expand-${u.id}" class="expand-row" hidden>
    <td></td>
    <td colspan="6">
      <div class="expand-box" id="expand-box-${u.id}">
        <strong>Pets (${(u.pets?.length || 0)}):</strong>
        <div class="pet-list">
          ${(u.pets || []).map(p => `
            <div class="pet-chip">
              <a href="/employee/pet?id=${p.id}">
                <div><b>${p.name}</b></div>
                <div>${p.breed} • ${p.species} • ${p.sex} • ${p.age}y</div>
              </a>
            </div>
          `).join('') || '<em>No pets found.</em>'}
        </div>
      </div>
    </td>
  </tr>
`;

const wireExpanders = () => {
  tbody.querySelectorAll('.row-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const tr = btn.closest('tr');
      const id = tr?.getAttribute('data-userid');
      const exp = document.getElementById(`expand-${id}`);
      const box = document.getElementById(`expand-box-${id}`);
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
          exp.setAttribute('hidden','');
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

// =====================
// LOAD + RENDER LIST (API mode with fallback)
// =====================
const loadUsers = async () => {
  tbody.innerHTML = `<tr><td colspan="7" style="padding:12px;color:#667085">Loading…</td></tr>`;

  const { ok, body } = await fetchJSON(API_USERS_WITH_PETS);

  if (!ok) {
    console.warn('API error, using dummy data:', body);
  }

  const src = ok ? (body.items || body || []) : (DUMMY_RESPONSE.items || []);

  if (!src.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:12px;color:#667085"><em>No users found.</em></td></tr>`;
    return;
  }

  tbody.innerHTML = src.map(rowHTML).join('');
  wireExpanders();
};

loadUsers();
