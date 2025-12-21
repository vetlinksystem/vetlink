const qs = new URLSearchParams(location.search);
const id = String(qs.get('id') || '').trim();

const userInfo = document.getElementById('userInfo');
const userPets = document.getElementById('userPets');

const fetchJSON = async (url) => {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
  } catch (e) {
    return { ok: false, body: { message: e.message } };
  }
};

const render = (user, pets) => {
  if (!user) {
    userInfo.innerHTML = "<em>User not found.</em>";
    userPets.innerHTML = '';
    return;
  }

  const name = user.full_name || user.name || user.fullName || 'User';
  userInfo.innerHTML = `
    <p><strong>ID:</strong> ${user.id || ''}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${user.email || ''}</p>
    <p><strong>Contact No.:</strong> ${user.contact_no || user.number || ''}</p>
    <p><strong>Address:</strong> ${user.address || ''}</p>
  `;

  const rows = Array.isArray(pets) ? pets : [];
  const thead = '<thead><tr><th>ID</th><th>Name</th><th>Breed</th><th>Species</th><th>Sex</th><th>Age</th><th>DOB</th><th>Weight</th></tr></thead>';
  const tbody = '<tbody>' + rows.map(p => {
    const pid = p.id || '';
    return `
      <tr>
        <td><a href="/employee/pet?id=${encodeURIComponent(pid)}">${pid}</a></td>
        <td>${p.name || ''}</td>
        <td>${p.breed || ''}</td>
        <td>${p.species || ''}</td>
        <td>${p.sex || ''}</td>
        <td>${p.age ?? ''}</td>
        <td>${p.dateOfBirth || p.dob || ''}</td>
        <td>${p.weight || ''}</td>
      </tr>`;
  }).join('') + '</tbody>';

  userPets.innerHTML = thead + tbody;
};

(async () => {
  if (!id) {
    userInfo.innerHTML = '<em>Missing user id.</em>';
    return;
  }

  const r = await fetchJSON(`/employee/users/get?id=${encodeURIComponent(id)}`);
  if (!r.ok || !r.body || r.body.success === false) {
    userInfo.innerHTML = '<em>Failed to load user.</em>';
    return;
  }
  render(r.body.user, r.body.pets);
})();
