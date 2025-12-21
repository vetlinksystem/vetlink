// Update Profile page — dummy now; API calls commented and ready.

// ===== API endpoints (enable later) =====
// const API_ME          = '/me';                 // GET current employee
// const API_UPDATE_ME   = '/me';                 // PUT { name,email,phone,address }
// const API_UPDATE_PW   = '/me/password';        // PUT { currentPassword, newPassword }
// const API_UPDATE_AVA  = '/me/avatar';          // PUT multipart/form-data { file }

// const fetchJSON = async (url, options = {}, timeoutMs=15000) => {
//   const ctl = new AbortController(); const t=setTimeout(()=>ctl.abort(), timeoutMs);
//   try {
//     const res = await fetch(url, { credentials:'include', headers:{ 'Accept':'application/json', ...(options.headers||{}) }, signal:ctl.signal, ...options });
//     clearTimeout(t);
//     const body = await res.json().catch(()=> ({}));
//     return { ok:res.ok, status:res.status, body };
//   } catch (e) { clearTimeout(t); return { ok:false, status:0, body:{ message:e.message } }; }
// };

// ===== Dummy profile (remove when enabling API) =====
let ME = {
  id: 11,
  name: "Admin",
  email: "admin@vetlink.cloud",
  phone: "0917-000-0000",
  address: "Tagum City, Davao del Norte",
  role: "Administrator",       // read-only (admin-managed)
  avatarUrl: "/avatar-placeholder.png"
};

// ===== DOM =====
const nameInput = document.getElementById('nameInput');
const emailInput = document.getElementById('emailInput');
const phoneInput = document.getElementById('phoneInput');
const addressInput = document.getElementById('addressInput');
const roleValue = document.getElementById('roleValue');

const infoForm = document.getElementById('infoForm');

const curPassInput = document.getElementById('curPassInput');
const newPassInput = document.getElementById('newPassInput');
const confPassInput = document.getElementById('confPassInput');
const passwordForm = document.getElementById('passwordForm');

const chooseAvatarBtn = document.getElementById('chooseAvatarBtn');
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
const removeAvatarBtn = document.getElementById('removeAvatarBtn');
const avatarFile = document.getElementById('avatarFile');
const avatarPreview = document.getElementById('avatarPreview');

// ===== Load profile =====
const fillForm = () => {
  nameInput.value = ME.name || '';
  emailInput.value = ME.email || '';
  phoneInput.value = ME.phone || '';
  addressInput.value = ME.address || '';
  roleValue.textContent = ME.role ? `${ME.role} (read-only)` : '— set by Admin —';
  avatarPreview.src = ME.avatarUrl || '/avatar-placeholder.png';
};

const loadMe = async () => {
  // API MODE:
  // const { ok, body } = await fetchJSON(API_ME);
  // if (ok) ME = body;
  fillForm();
};

// ===== Save personal info =====
const onSaveInfo = async (e) => {
  e.preventDefault();
  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    address: addressInput.value.trim()
  };
  if (!payload.name || !payload.email || !payload.phone) return;

  // DUMMY UPDATE
  ME = { ...ME, ...payload };
  // API MODE:
  // const { ok } = await fetchJSON(API_UPDATE_ME, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
  // if (!ok) return alert('Failed to update profile');

  toast('Profile saved.');
};

infoForm.addEventListener('submit', onSaveInfo);

// ===== Change password =====
const onChangePassword = async (e) => {
  e.preventDefault();
  const currentPassword = curPassInput.value;
  const newPassword = newPassInput.value;
  const confirmPassword = confPassInput.value;

  if (newPassword !== confirmPassword) {
    alert('New password and confirmation do not match.');
    return;
  }
  if (newPassword.length < 8) {
    alert('Use at least 8 characters.');
    return;
  }

  // DUMMY: pretend success if currentPassword is "admin"
  if (currentPassword !== 'admin') {
    alert('Current password is incorrect.');
    return;
  }

  // API MODE:
  // const { ok } = await fetchJSON(API_UPDATE_PW, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
  // if (!ok) return alert('Failed to update password');

  curPassInput.value = newPassInput.value = confPassInput.value = '';
  toast('Password updated.');
};

passwordForm.addEventListener('submit', onChangePassword);

// ===== Avatar upload/remove =====
let selectedAvatarFile = null;

chooseAvatarBtn.addEventListener('click', () => avatarFile.click());

avatarFile.addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  if (f.size > 2 * 1024 * 1024) { alert('Max 2MB.'); avatarFile.value=''; return; }
  selectedAvatarFile = f;
  const reader = new FileReader();
  reader.onload = (ev) => { avatarPreview.src = ev.target.result; };
  reader.readAsDataURL(f);
});

uploadAvatarBtn.addEventListener('click', async () => {
  if (!selectedAvatarFile) { alert('Choose an image first.'); return; }

  // DUMMY: persist preview url
  ME.avatarUrl = avatarPreview.src;

  // API MODE:
  // const fd = new FormData();
  // fd.append('file', selectedAvatarFile);
  // const res = await fetch(API_UPDATE_AVA, { method:'PUT', credentials:'include', body: fd });
  // if (!res.ok) return alert('Failed to upload avatar');

  selectedAvatarFile = null;
  avatarFile.value = '';
  toast('Avatar updated.');
});

removeAvatarBtn.addEventListener('click', async () => {
  // DUMMY: reset to placeholder
  ME.avatarUrl = '/avatar-placeholder.png';

  // API MODE: you may provide DELETE /me/avatar or PUT with empty file
  // await fetch(API_UPDATE_AVA, { method:'DELETE', credentials:'include' });

  avatarPreview.src = ME.avatarUrl;
  toast('Avatar removed.');
});

// ===== Small toast helper (non-blocking) =====
const toast = (msg) => {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', right:'16px', bottom:'16px', background:'#0f172a', color:'#fff',
    padding:'10px 12px', borderRadius:'10px', fontSize:'13px', opacity:'0',
    transition:'opacity .2s ease', zIndex: 9999
  });
  document.body.appendChild(t);
  requestAnimationFrame(()=> t.style.opacity='1');
  setTimeout(()=> {
    t.style.opacity='0';
    t.addEventListener('transitionend', ()=> t.remove(), { once:true });
  }, 1800);
};

// ===== Init =====
loadMe();
