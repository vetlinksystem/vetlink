/* Core JS (shared across client pages)
   - Responsive sidebar + scrim
   - Global toast
   - API client (stubs) with request/response specs
*/

(function sidebarControl(){
  const sidebarEl = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  function sidebar(open){
    if(window.innerWidth>=980) return;
    sidebarEl?.classList.toggle('open', open);
    scrim?.classList.toggle('show', open);
  }
  const openBtn = document.getElementById('openSidebar');
  openBtn?.addEventListener('click', ()=>sidebar(true));
  scrim?.addEventListener('click', ()=>sidebar(false));
  window.addEventListener('resize', ()=>{
    if(window.innerWidth>=980){ sidebarEl?.classList.remove('open'); scrim?.classList.remove('show'); }
  });
})();

window.theToast = (function(){
  let el = document.getElementById('toast');
  if(!el){ el = document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el); }
  return function(msg){ el.textContent = msg || 'Saved!'; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'), 1800); };
})();

/* API CLIENT
   Change basePath if your backend differs (e.g., '/v1/client').
*/
window.API = (function(){
  const basePath = '/api/client'; // 🔧 adjust as needed

  // --- Appointments ---
  /* listAppointments
     GET  ${basePath}/appointments?status=pending|confirmed|completed
     Response: { data:[{id, pet, service, date('YYYY-MM-DD'), time('HH:mm'), status}] }
  */
  async function listAppointments(params={}){
    // return fetch(`${basePath}/appointments?${new URLSearchParams(params)}`).then(r=>r.json());
    return { data:[
      {id:101,pet:'Buddy',service:'Vaccination',date:'2025-11-20',time:'09:00',status:'Confirmed'},
      {id:102,pet:'Mochi',service:'Grooming',date:'2025-11-28',time:'14:30',status:'Pending'},
      {id:103,pet:'Chika',service:'Check-up',date:'2025-09-02',time:'10:00',status:'Completed'}
    ]};
  }

  // --- Reservations ---
  /* listReservations
     GET  ${basePath}/reservations
     Response: { data:[{id, pet, type, from('YYYY-MM-DD'), to('YYYY-MM-DD'), status}] }
  */
  async function listReservations(){
    return { data:[
      {id:301,pet:'Buddy',type:'Boarding',from:'2025-12-22',to:'2025-12-28',status:'Approved'}
    ]};
  }

  // --- Pets ---
  /* listPets
     GET  ${basePath}/pets?search=&species=&page=1&pageSize=10
     Response: { data:[{id,name,species,breed,age,vaccines,lastVisit}], pagination:{page,pageSize,total} }
  */
  async function listPets(query={}){
    return { data:[{id:1,name:'Buddy'},{id:2,name:'Mochi'}], pagination:{page:1,pageSize:10,total:2} };
  }

  // --- Billing ---
  /* listInvoices
     GET  ${basePath}/invoices
     Response: { data:[{id,date,total,status}] }
  */
  async function listInvoices(){
    return { data:[{id:'INV-2072',date:'2025-11-05',total:1200,status:'Unpaid'}] };
  }

  // --- Profile ---
  /* updateProfile
     POST ${basePath}/profile/update
     Body JSON: { firstName: string, lastName: string }
     Response: { success:true, profile:{ id, firstName, lastName, email } }
  */
  async function updateProfile(payload){
    // return fetch(`${basePath}/profile/update`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).then(r=>r.json());
    return { success:true, profile:{ id:'me', email:'ken@vetlink', ...payload } };
  }

  return { listAppointments, listReservations, listPets, listInvoices, updateProfile };
})();

/* LOGOUT HANDLER
   Uses existing POST /logout route from loginRouters.post('/logout', ...)
*/
(function logoutControl(){
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // Create a hidden form that does POST /logout
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/logout';

    document.body.appendChild(form);
    form.submit();
  });
})();


/* ACCOUNT CHIP
   If a page contains <strong id="accountName">...</strong>, we populate it from
   GET /client/profile/me (same endpoint used in profile.js).
*/
(function populateAccountChip(){
  const el = document.getElementById('accountName');
  if (!el) return;

  fetch('/client/profile/me', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  })
    .then(r => r.json().catch(() => ({})))
    .then(body => {
      const client = body.client || body || {};
      const name = client.name || client.full_name || client.email;
      if (name) el.textContent = name;
    })
    .catch(() => {});
})();

/* NOTIFICATIONS (breeding proposals)
   - Uses API:
       GET  /notifications/my
       PUT  /notifications/mark-read  { id }
       PUT  /breeding/update-status  { id, decision }
*/
(function notificationsControl(){
  // Insert bell UI into the top header (client pages share <header class="top">)
  const header = document.querySelector('header.top');
  if (!header) return;

  // If already exists, don't duplicate
  if (document.getElementById('notifBtn')) return;

  // Right side container is usually the last flex div in header
  const right = header.querySelector('div[style*="display:flex"], .right') || header.lastElementChild;
  if (!right) return;

  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.innerHTML = `
    <button class="btn ghost" id="notifBtn" type="button" title="Notifications" style="position:relative">
      🔔
      <span id="notifCount" style="display:none;position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#e11d48;color:#fff;font-size:12px;line-height:18px;text-align:center;">0</span>
    </button>
    <div id="notifMenu" class="card" style="display:none;position:absolute;right:0;top:42px;z-index:50;min-width:320px;max-width:360px;padding:.5rem;box-shadow:0 12px 30px rgba(16,24,40,.18)"></div>
  `;
  right.prepend(wrap);

  const btn = document.getElementById('notifBtn');
  const menu = document.getElementById('notifMenu');
  const countEl = document.getElementById('notifCount');

  const fetchJSON = async (url, options = {}, timeoutMs = 15000) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept':'application/json', 'Content-Type':'application/json' },
        signal: ctl.signal,
        ...options
      });
      clearTimeout(t);
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body };
    } catch (e) {
      clearTimeout(t);
      return { ok:false, status:0, body:{ message:e.message } };
    }
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));

  // Popup modal for reading a notification
  const notifState = { items: [] };
  const modal = document.createElement('div');
  modal.id = 'notifReadModal';
  modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = `
    <div data-close style="position:absolute;inset:0;background:rgba(0,0,0,.45)"></div>
    <div style="position:relative;max-width:520px;width:92vw;background:#fff;border-radius:18px;padding:1rem 1rem .9rem;border:1px solid var(--border);box-shadow:0 20px 50px rgba(16,24,40,.25)">
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start">
        <div>
          <div id="nrTitle" style="font-weight:900;font-size:1.05rem">Notification</div>
          <div id="nrDate" style="color:var(--muted);font-size:.85rem;margin-top:.15rem"></div>
        </div>
        <button class="btn ghost" type="button" data-close aria-label="Close">✕</button>
      </div>
      <div id="nrBody" style="margin-top:.75rem;color:#344054;white-space:pre-wrap"></div>
      <div id="nrActions" style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;margin-top:1rem"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const openNotifModal = async (n) => {
    if (!n) return;
    const titleEl = modal.querySelector('#nrTitle');
    const dateEl  = modal.querySelector('#nrDate');
    const bodyEl  = modal.querySelector('#nrBody');
    const actEl   = modal.querySelector('#nrActions');

    titleEl.textContent = n.title || 'Notification';
    dateEl.textContent = (n.createdAt || '').toString().slice(0,10);
    bodyEl.textContent = n.message || '';
    actEl.innerHTML = '';

    const close = () => { modal.style.display = 'none'; };

    const markRead = async () => {
      if (!n.read) {
        await fetchJSON('/notifications/mark-read', { method:'PUT', body: JSON.stringify({ id: n.id }) });
      }
      await refresh();
    };

    const payload = n.payload || {};
    const breedingId = payload.breedingId || payload.id || '';
    const isBreeding = n.type === 'breeding_proposal' && breedingId;

    if (isBreeding) {
      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn';
      approveBtn.type = 'button';
      approveBtn.textContent = 'Approve';
      approveBtn.onclick = async () => {
        const r = await fetchJSON('/breeding/update-status', { method:'PUT', body: JSON.stringify({ id: breedingId, decision:'approve' }) });
        if (!r.ok || r.body?.success === false) { theToast(r.body?.message || 'Failed to approve.'); return; }
        theToast('Approved.');
        await markRead();
        close();
      };

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn secondary';
      rejectBtn.type = 'button';
      rejectBtn.textContent = 'Reject';
      rejectBtn.onclick = async () => {
        const r = await fetchJSON('/breeding/update-status', { method:'PUT', body: JSON.stringify({ id: breedingId, decision:'reject' }) });
        if (!r.ok || r.body?.success === false) { theToast(r.body?.message || 'Failed to reject.'); return; }
        theToast('Rejected.');
        await markRead();
        close();
      };
      actEl.appendChild(rejectBtn);
      actEl.appendChild(approveBtn);
    }

    const markBtn = document.createElement('button');
    markBtn.className = 'btn ghost';
    markBtn.type = 'button';
    markBtn.textContent = 'Mark read';
    markBtn.onclick = async () => { await markRead(); close(); };
    actEl.appendChild(markBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn ghost';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = close;
    actEl.appendChild(closeBtn);

    modal.style.display = 'flex';
  };

  modal.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', () => (modal.style.display = 'none')));

  const render = (items) => {
    notifState.items = Array.isArray(items) ? items : [];
    const unread = items.filter(n => !n.read).length;
    if (unread > 0) {
      countEl.style.display = 'inline-block';
      countEl.textContent = String(unread);
    } else {
      countEl.style.display = 'none';
    }

    if (!items.length) {
      menu.innerHTML = `<div style="padding:.75rem;color:var(--muted)">No notifications</div>`;
      return;
    }

    menu.innerHTML = items.slice(0, 20).map(n => {
      const payload = n.payload || {};
      const breedingId = payload.breedingId || payload.id || '';
      const isBreeding = n.type === 'breeding_proposal' && breedingId;
      return `
        <div data-nid="${esc(n.id)}" style="padding:.65rem .6rem;border-radius:12px;border:1px solid var(--border);margin:.5rem 0;background:${n.read ? 'transparent' : 'rgba(59,130,246,.06)'}">
          <div style="display:flex;justify-content:space-between;gap:.5rem">
            <strong style="font-size:.95rem">${esc(n.title || 'Notification')}</strong>
            <small style="color:var(--muted)">${esc((n.createdAt || '').toString().slice(0, 10))}</small>
          </div>
          <div style="margin-top:.35rem;color:#344054;font-size:.92rem">${esc(n.message || '')}</div>
          ${isBreeding ? `
            <div style="display:flex;gap:.5rem;margin-top:.55rem;flex-wrap:wrap">
              <button class="btn" data-approve="${esc(breedingId)}">Approve</button>
              <button class="btn secondary" data-reject="${esc(breedingId)}">Reject</button>
              ${n.read ? '' : `<button class="btn ghost" data-markread="${esc(n.id)}">Mark read</button>`}
            </div>
          ` : (n.read ? '' : `<div style="margin-top:.55rem"><button class="btn ghost" data-markread="${esc(n.id)}">Mark read</button></div>`)}
        </div>
      `;
    }).join('');

    // Wire actions
    menu.querySelectorAll('[data-markread]').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-markread');
        await fetchJSON('/notifications/mark-read', { method:'PUT', body: JSON.stringify({ id }) });
        await refresh();
      });
    });
    menu.querySelectorAll('[data-approve]').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-approve');
        const card = b.closest('[data-nid]');
        const nid = card?.getAttribute('data-nid');
        const r = await fetchJSON('/breeding/update-status', { method:'PUT', body: JSON.stringify({ id, decision:'approve' }) });
        if (!r.ok || r.body?.success === false) {
          theToast(r.body?.message || 'Failed to approve.');
          return;
        }
        if (nid) await fetchJSON('/notifications/mark-read', { method:'PUT', body: JSON.stringify({ id: nid }) });
        theToast('Approved.');
        await refresh();
      });
    });
    menu.querySelectorAll('[data-reject]').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-reject');
        const card = b.closest('[data-nid]');
        const nid = card?.getAttribute('data-nid');
        const r = await fetchJSON('/breeding/update-status', { method:'PUT', body: JSON.stringify({ id, decision:'reject' }) });
        if (!r.ok || r.body?.success === false) {
          theToast(r.body?.message || 'Failed to reject.');
          return;
        }
        if (nid) await fetchJSON('/notifications/mark-read', { method:'PUT', body: JSON.stringify({ id: nid }) });
        theToast('Rejected.');
        await refresh();
      });
    });

    // Clicking the notification card opens a popup with the full message
    menu.querySelectorAll('[data-nid]').forEach(card => {
      card.addEventListener('click', async (e) => {
        // Ignore clicks on buttons within the card
        if (e.target && (e.target.tagName === 'BUTTON' || e.target.closest('button'))) return;
        const nid = card.getAttribute('data-nid');
        const n = (notifState.items || []).find(x => String(x.id) === String(nid));
        menu.style.display = 'none';
        await openNotifModal(n);
      });
    });
  };

  const refresh = async () => {
    const r = await fetchJSON('/notifications/my', { method:'GET' });
    const items = Array.isArray(r.body?.notifications) ? r.body.notifications : [];
    render(items);
  };

  const toggle = async () => {
    const show = menu.style.display !== 'block';
    menu.style.display = show ? 'block' : 'none';
    if (show) await refresh();
  };

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    toggle();
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  // Lightweight polling every 30s to keep unread count fresh
  refresh();
  setInterval(refresh, 30000);
})();

/* TEMP: HIDE RECORDS NAV (storage paused)
   We are not deleting the page; just hiding entry points in the client UI.
*/
(function hideRecordsNav(){
  document.querySelectorAll('a[href="/client/records"]').forEach(a => {
    a.style.display = 'none';
  });
})();
