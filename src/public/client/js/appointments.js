/* ===========================================================
   📡 APPOINTMENTS — API CONTRACT
   -----------------------------------------------------------
   GET  /api/client/appointments?status=pending|confirmed|completed
   → { "data":[{ "id":101,"pet":"Buddy","service":"Vaccination","date":"2025-11-20","time":"09:00","status":"Confirmed" }]}
   POST /api/client/appointments
   → Body { "petId":1,"service":"Vaccination","date":"2025-11-28","time":"14:30","note":"optional" }
   → Resp { "id":999,"pet":"Buddy","service":"Vaccination","date":"2025-11-28","time":"14:30","status":"Pending" }
   DELETE /api/client/appointments/:id
   → { "success": true }
   PATCH /api/client/appointments/:id   // (optional reschedule)
   → Body { "date":"YYYY-MM-DD","time":"HH:mm" }
   → Resp { "success": true, "appointment":{...} }
   =========================================================== */

(function ensureApi(){
  if(!window.API) window.API = {};
  const basePath = '/api/client';

  if(!API.listAppointments){
    API.listAppointments = async (params={})=>{
      return { data:[
        {id:101,pet:'Buddy',service:'Vaccination',date:'2025-11-20',time:'09:00',status:'Confirmed'},
        {id:102,pet:'Mochi',service:'Grooming',date:'2025-11-28',time:'14:30',status:'Pending'},
        {id:103,pet:'Chika',service:'Check-up',date:'2025-09-02',time:'10:00',status:'Completed'}
      ]};
      // real: return fetch(`${basePath}/appointments?${new URLSearchParams(params)}`).then(r=>r.json());
    };
  }
  if(!API.createAppointment){
    API.createAppointment = async payload=>{
      return { id:Date.now(), pet:'(server maps by petId)', status:'Pending', ...payload };
      // real: return fetch(`${basePath}/appointments`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).then(r=>r.json());
    };
  }
  if(!API.cancelAppointment){
    API.cancelAppointment = async id=>({ success:true });
    // real: return fetch(`${basePath}/appointments/${id}`, {method:'DELETE'}).then(r=>r.json());
  }
  if(!API.listPets){
    API.listPets = async()=>({ data:[{id:1,name:'Buddy'},{id:2,name:'Mochi'}], pagination:{page:1,pageSize:10,total:2} });
  }
})();

(function ui(){
  const tabs = document.querySelectorAll('.tabs button');
  const wrap = { upcoming: el('apt-upcoming'), past: el('apt-past'), requests: el('apt-requests') };

  tabs.forEach(b=>b.addEventListener('click',()=>{
    tabs.forEach(x=>{ x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
    b.classList.add('active'); b.setAttribute('aria-selected','true');
    render(b.dataset.tab);
  }));

  document.getElementById('openBook').addEventListener('click', openBook);
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', ()=>el('bookModal').classList.remove('show')));
  document.getElementById('notifBtn').addEventListener('click', ()=>theToast('No new notifications'));
  if(location.hash.startsWith('#book')) openBook();

  load();

  async function load(){ render('upcoming'); }

  async function render(tab){
    const resp = await API.listAppointments({});
    const today = new Date().toISOString().slice(0,10);
    let items = (resp.data||[]).slice();
    if(tab==='upcoming') items = items.filter(a=>a.date>=today && a.status!=='Completed');
    if(tab==='past') items = items.filter(a=>a.date<today || a.status==='Completed');
    if(tab==='requests') items = items.filter(a=>a.status==='Pending');

    Object.values(wrap).forEach(e=>e.classList.add('hidden'));
    const target = wrap[tab]; target.classList.remove('hidden');
    target.innerHTML = items.length ? items.map(card).join('') : `<div style='padding:.5rem;color:#6b7280'>No items</div>`;
  }

  function card(a){
    return `<div class="item">
      <div>
        <span class="badge ${a.status}">${a.status}</span>
        <strong style="display:block;margin-top:.35rem">${escapeHtml(a.pet)} • ${escapeHtml(a.service)}</strong>
        <small style="color:#6b7280">${a.date} at ${a.time}</small>
      </div>
      <div style="display:flex;gap:.5rem">
        ${a.status!=='Completed' ? `<button class="btn secondary" data-resched="${a.id}">Reschedule</button>` : ``}
        <button class="btn ghost" data-cancel="${a.id}">Cancel</button>
      </div>
    </div>`;
  }

  document.addEventListener('click', async(e)=>{
    const cid = e.target.getAttribute('data-cancel');
    if(cid){ await API.cancelAppointment(Number(cid)); theToast('Appointment canceled'); render(currentTab()); }
    const rid = e.target.getAttribute('data-resched');
    if(rid){ theToast('Reschedule flow (stub)'); }
  });

  async function openBook(){
    const mPet = document.getElementById('mPet');
    const {data} = await API.listPets({});
    mPet.innerHTML = '<option>Choose pet…</option>' + data.map(p=>`<option value='${p.id}'>${escapeHtml(p.name)}</option>`).join('');
    el('bookModal').classList.add('show');
  }
  document.getElementById('mSubmit').addEventListener('click', async()=>{
    const payload = { petId: val('mPet'), service: val('mService'), date: val('mDate'), time: val('mTime'), note: val('mNote') };
    if(!payload.petId || !payload.date || !payload.time){ theToast('Please complete the form'); return; }
    await API.createAppointment(payload);
    theToast('Appointment requested');
    el('bookModal').classList.remove('show');
    render('upcoming');
  });

  function currentTab(){ return document.querySelector('.tabs button.active')?.dataset.tab || 'upcoming'; }
  function el(id){ return document.getElementById(id); }
  function val(id){ return document.getElementById(id).value; }
  function escapeHtml(s){ return (s??'').toString().replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m])); }
})();
