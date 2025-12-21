const qs = new URLSearchParams(location.search);
const id = String(qs.get('id') || '').trim();
const el = document.getElementById('petInfo');

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

const render = (p, owner) => {
  if (!p) {
    el.innerHTML = '<em>Pet not found.</em>';
    return;
  }

  const ownerId = p.ownerId || (owner && owner.id) || '';
  const ownerName = owner ? (owner.full_name || owner.name || 'Owner') : `Owner #${ownerId}`;
  const ownerLink = ownerId ? `<a href="/employee/user?id=${encodeURIComponent(ownerId)}">${ownerName}</a>` : ownerName;

  el.innerHTML = `
    <p><strong>Pet ID:</strong> ${p.id || ''}</p>
    <p><strong>Name:</strong> ${p.name || ''}</p>
    <p><strong>Breed:</strong> ${p.breed || ''}</p>
    <p><strong>Species:</strong> ${p.species || ''}</p>
    <p><strong>Sex:</strong> ${p.sex || ''}</p>
    <p><strong>Age:</strong> ${p.age ?? ''}</p>
    <p><strong>Date of Birth:</strong> ${p.dateOfBirth || p.dob || ''}</p>
    <p><strong>Weight:</strong> ${p.weight || ''}</p>
    <p><strong>Owner:</strong> ${ownerLink}</p>
  `;
};

(async () => {
  if (!id) {
    el.innerHTML = '<em>Missing pet id.</em>';
    return;
  }

  const r = await fetchJSON(`/employee/pets/get?id=${encodeURIComponent(id)}`);
  if (!r.ok || !r.body || r.body.success === false) {
    el.innerHTML = '<em>Failed to load pet.</em>';
    return;
  }

  render(r.body.pet, r.body.owner);
})();
