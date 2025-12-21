/* ===========================================================
   📡 RESERVATIONS — API CONTRACT
   -----------------------------------------------------------
   GET  /api/client/reservations?type=&status=
   → { "data":[ { "id":301,"pet":"Buddy","type":"Boarding","from":"2025-12-22","to":"2025-12-28","status":"Approved" } ] }

   POST /api/client/reservations
   → Body { "petId":1, "type":"Boarding", "from":"2025-12-22", "to":"2025-12-28", "note":"optional" }
   → Resp { "id":999, "pet":"Buddy", "type":"Boarding", "from":"2025-12-22", "to":"2025-12-28", "status":"Pending" }

   DELETE /api/client/reservations/:id
   → { "success": true }

   (Optional)
   PATCH /api/client/reservations/:id
   → Body { "from":"YYYY-MM-DD", "to":"YYYY-MM-DD" } // reschedule/extend
   → Resp { "success": true, "reservation": { ... } }
   =========================================================== */

(function ensureApi(){
  if(!window.API) window.API = {};
  const basePath = '/api/client';

  if(!API.listReservations){
    API.listReservations = async (params={})=>{
      return { data:[
        {id:301,pet:'Buddy',type:'Boarding',from:'2025-12-22',to:'2025-12-28',status:'Approved'},
        {id:302,pet:'Mochi',type:'Grooming',from:'2025-11-25',to:'2025-11-25',status:'Pending'},
        {id:303,pet:'Chika',type:'Daycare',from:'2025-09-03',to:'2025-09-03',status:'Completed'}
      ]};
      // real: return fetch(`${basePath}/reservations?${new URLSearchParams(params)}`).then(r=>r.json());
    };
  }
  if(!API.createReservation){
    API.createReservation = async payload=>{
      return { id:Date.now(), pet:'(server maps by petId)', status:'Pending', ...payload };
      // real: return fetch(`${basePath}/reservations`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).then(r=>r.json());
    };
  }
  if(!API.cancelReservation){
    API.cancelReservation = async id=>({ success:true });
    // real: return fetch(`${basePath}/reservations/${id}`, {method:'DELETE'}).then(r=>r.json());
  }
  if(!API.listPets){
    API.listPets = async()=>({ data:[{id:1,name:'Buddy'},{id:2,name:'Mochi'}], pagination:{page:1,pageSize:10,total:2} });
  }
})();

(function ui(){
  const tabs = document.querySelectorAll('.tabs button');
  const wrap = { upcoming: el('res-upcoming'), past: el('res-past'), requests: el('res-requests') };
  const typeFilter = document.getElementById('typeFilter');
  const statusFilter = document.getElementById('statusFilter');

  tabs.forEach(b=>b.addEventListener('click',()=>{
    tabs.forEach(x=>{ x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
    b.classList.add('active'); b.setAttribute('aria-selected','true');
    render(b.dataset.tab);
  }));

  document.getElementById('openReserve').addEventListener('click', openReserve);
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', ()=>el('reserveModal').classList.remove('show')));
  document.getElementById('notifBtn').addEventListener('click', ()=>theToast('No new notifications'));
  typeFilter.addEventListener('change', ()=>render(currentTab()));
  statusFilter.addEventListener('change', ()=>render(currentTab()));

  load();

  async function load(){ render('upcoming'); }

  async function render(tab){
    const resp = await API.listReservations({});
    const today = new Date().toISOString().slice(0,10);

    let items = (resp.data||[]).slice();
    // Tab buckets
    if(tab==='upcoming') items = items.filter(r=>r.to>=today && r.status!=='Completed' && r.status!=='Cancelled');
    if(tab==='past') items = items.filter(r=>r.to<today || r.status==='Completed' || r.status==='Cancelled');
    if(tab==='requests') items = items.filter(r=>r.status==='Pending');

    // Quick filters
    if(typeFilter.value)   items = items.filter(r=>r.type===typeFilter.value);
    if(statusFilter.value) items = items.filter(r=>r.status===statusFilter.value);

    Object.values(wrap).forEach(e=>e.classList.add('hidden'));
    const target = wrap[tab]; target.classList.remove('hidden');
    target.innerHTML = items.length ? items.map(card).join('') : `<div style='padding:.5rem;color:#6b7280'>No items</div>`;
  }

  function card(r){
    return `<div class="item">
      <div>
        <span class="badge ${r.status}">${r.status}</span>
        <strong style="display:block;margin-top:.35rem">${escapeHtml(r.type)} for ${escapeHtml(r.pet)}</strong>
        <small style="color:#6b7280">${r.from} → ${r.to}</small>
      </div>
      <div style="display:flex;gap:.5rem">
        ${r.status!=='Completed' && r.status!=='Cancelled' ? `<button class="btn secondary" data-resched="${r.id}">Reschedule</button>` : ``}
        ${r.status!=='Cancelled' ? `<button class="btn ghost" data-cancel="${r.id}">Cancel</button>` : ``}
      </div>
    </div>`;
  }

  document.addEventListener('click', async(e)=>{
    const cid = e.target.getAttribute('data-cancel');
    if(cid){ await API.cancelReservation(Number(cid)); theToast('Reservation canceled'); render(currentTab()); }
    const rid = e.target.getAttribute('data-resched');
    if(rid){ theToast('Reschedule flow (stub)'); }
  });

  async function openReserve(){
    const {data} = await API.listPets({});
    const sel = document.getElementById('rPet');
    sel.innerHTML = '<option>Choose pet…</option>' + data.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    el('reserveModal').classList.add('show');
  }
  document.getElementById('rSubmit').addEventListener('click', async()=>{
    const payload = {
      petId: val('rPet'), type: val('rType'),
      from: val('rFrom'), to: val('rTo'), note: val('rNote')
    };
    if(!payload.petId || !payload.from || !payload.to){ theToast('Please complete the form'); return; }
    if(payload.to < payload.from){ theToast('"To" date must be after "From"'); return; }
    await API.createReservation(payload);
    theToast('Reservation requested');
    el('reserveModal').classList.remove('show');
    render('upcoming');
  });

  function currentTab(){ return document.querySelector('.tabs button.active')?.dataset.tab || 'upcoming'; }
  function el(id){ return document.getElementById(id); }
  function val(id){ return document.getElementById(id).value; }
  function escapeHtml(s){ return (s??'').toString().replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m])); }
})();
