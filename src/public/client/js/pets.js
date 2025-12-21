/* ===========================================================
   📡 PETS — API CONTRACT (requests & expected responses)
   ===========================================================
   1) GET  /api/client/pets?search=&species=&page=1&pageSize=10
      Response:
      {
        "data": [
          {
            "id": 1,
            "name": "Buddy",
            "species": "Dog",
            "breed": "Golden Retriever",
            "age": 3,
            "breedingAllowed": true,      // NEW: owner preference
            "vaccines": ["Rabies","DHPP"],
            "lastVisit": "2025-10-02"
          }
        ],
        "pagination": { "page":1, "pageSize":10, "total": 12 }
      }

   2) POST /api/client/pets
      Body:
      {
        "name":"Buddy",
        "species":"Dog",
        "breed":"Golden Retriever",
        "age":3,
        "breedingAllowed": true,          // boolean (owner can allow/not allow)
        "notes":"optional"
      }
      Response: 201
      { "id": 999, "name":"Buddy", "species":"Dog", "breed":"Golden Retriever", "age":3, "breedingAllowed":true, "vaccines":[], "lastVisit":"—" }

   3) PATCH /api/client/pets/:id
      Body: any updatable fields (same keys as POST)
      Response: 200 { "success": true, "pet": { ...updatedPet } }

   4) DELETE /api/client/pets/:id
      Response: 200 { "success": true }
   ----------------------------------------------------------- */

(function ensureApi(){
  // If core.js hasn't provided these yet, create light mocks
  if(!window.API) window.API = {};
  const basePath = '/api/client';

  if(!API.listPets){
    API.listPets = async ({search='',species='',page=1,pageSize=4}={})=>{
      // mock data
      window.__PETS ||= [
        {id:1,name:'Buddy',species:'Dog',breed:'Golden Retriever',age:3,breedingAllowed:true, vaccines:['Rabies','DHPP'], lastVisit:'2025-10-02'},
        {id:2,name:'Mochi',species:'Cat',breed:'Scottish Fold',age:2,breedingAllowed:false, vaccines:['FVRCP'], lastVisit:'2025-09-20'},
        {id:3,name:'Chika',species:'Dog',breed:'Aspin',age:5,breedingAllowed:false, vaccines:['Anti-Rabies'], lastVisit:'2025-08-10'},
        {id:4,name:'Pochi',species:'Dog',breed:'Shih Tzu',age:1,breedingAllowed:true, vaccines:['DHPP'], lastVisit:'2025-07-01'}
      ];
      const list = window.__PETS.filter(p =>
        (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.breed.toLowerCase().includes(search.toLowerCase())) &&
        (!species || p.species===species)
      );
      const start=(page-1)*pageSize;
      return { data:list.slice(start,start+pageSize), pagination:{page,pageSize,total:list.length} };
      // 🔁 real impl:
      // return fetch(`${basePath}/pets?${new URLSearchParams({search,species,page,pageSize})}`).then(r=>r.json());
    };
  }

  if(!API.createPet){
    API.createPet = async (payload)=>{
      const item = { id:Date.now(), vaccines:[], lastVisit:'—', ...payload };
      window.__PETS.unshift(item);
      return item;
      // real:
      // return fetch(`${basePath}/pets`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).then(r=>r.json());
    };
  }

  if(!API.updatePet){
    API.updatePet = async (id, payload)=>{
      const i = window.__PETS.findIndex(p=>p.id===id);
      if(i>-1) window.__PETS[i] = { ...window.__PETS[i], ...payload };
      return { success:true, pet: window.__PETS[i] };
      // real:
      // return fetch(`${basePath}/pets/${id}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).then(r=>r.json());
    };
  }

  if(!API.deletePet){
    API.deletePet = async (id)=>{
      window.__PETS = window.__PETS.filter(p=>p.id!==id);
      return { success:true };
      // real:
      // return fetch(`${basePath}/pets/${id}`, {method:'DELETE'}).then(r=>r.json());
    };
  }
})();

(function ui(){
  const tbody = document.querySelector('#petsTable tbody');
  const info = document.getElementById('petsPageInfo');
  const prev = document.getElementById('prevPets');
  const next = document.getElementById('nextPets');
  const addBtn = document.getElementById('addPetBtn');
  const modal = document.getElementById('petModal');
  const closeBtns = modal.querySelectorAll('[data-close]');
  const submit = document.getElementById('pSubmit');
  const title = document.getElementById('petModalTitle');

  const state = { page:1, pageSize:4, search:'', species:'', editId:null };

  // simple toast notifications
  document.getElementById('notifBtn')?.addEventListener('click', ()=>theToast('No new notifications'));

  // filters / paging
  document.getElementById('petSearch').addEventListener('input', e=>{ state.search=e.target.value; state.page=1; load(); });
  document.getElementById('speciesFilter').addEventListener('change', e=>{ state.species=e.target.value; state.page=1; load(); });
  prev.addEventListener('click', ()=>{ if(state.page>1){ state.page--; load(); }});
  next.addEventListener('click', ()=>{ state.page++; load(); });

  // modal open/close
  addBtn.addEventListener('click', ()=>openModalFor());
  closeBtns.forEach(b=>b.addEventListener('click', closeModal));

  // save pet (create/update)
  submit.addEventListener('click', async()=>{
    const payload = collectForm();
    if(!payload.name){ theToast('Name is required'); return; }
    if(state.editId){
      await API.updatePet(state.editId, payload);
      theToast('Pet updated');
    }else{
      await API.createPet(payload);
      theToast('Pet added');
    }
    closeModal();
    load(true);
  });

  // table actions
  tbody.addEventListener('click', async(e)=>{
    // delete
    if(e.target.matches('[data-delete]')){
      await API.deletePet(Number(e.target.dataset.id));
      theToast('Pet deleted'); load(true);
    }
    // edit
    if(e.target.matches('[data-edit]')){
      const id = Number(e.target.dataset.id);
      const p = currentList.find(x=>x.id===id);
      openModalFor(p);
    }
    // toggle breeding
    if(e.target.matches('[data-btoggle]')){
      const id = Number(e.target.dataset.id);
      const allowed = e.target.checked;
      await API.updatePet(id, { breedingAllowed: allowed });
      theToast(allowed ? 'Breeding allowed' : 'Breeding not allowed');
      // reflect text badge quickly
      const badge = e.target.closest('td').querySelector('[data-badge]');
      if(badge){
        badge.className = 'chip ' + (allowed?'badge-yes':'badge-no');
        badge.textContent = allowed ? 'Allowed' : 'Not allowed';
      }
    }
  });

  function openModalFor(p){
    state.editId = p?.id || null;
    title.textContent = state.editId ? 'Edit Pet' : 'Add Pet';
    setVal('pName', p?.name || '');
    setVal('pSpecies', p?.species || 'Dog');
    setVal('pBreed', p?.breed || '');
    setVal('pAge', p?.age ?? '');
    document.getElementById('pBreeding').checked = !!p?.breedingAllowed;
    setVal('pNotes', p?.notes || '');
    modal.classList.add('show');
  }
  function closeModal(){ modal.classList.remove('show'); }
  function setVal(id,v){ document.getElementById(id).value = v; }
  function collectForm(){
    return {
      name:     document.getElementById('pName').value.trim(),
      species:  document.getElementById('pSpecies').value,
      breed:    document.getElementById('pBreed').value.trim(),
      age:      Number(document.getElementById('pAge').value || 0),
      breedingAllowed: document.getElementById('pBreeding').checked,
      notes:    document.getElementById('pNotes').value.trim()
    };
  }

  let currentList = [];
  async function load(reset){
    if(reset) state.page=1;
    const {data, pagination} = await API.listPets({search:state.search,species:state.species,page:state.page,pageSize:state.pageSize});
    currentList = data;
    const start=(pagination.page-1)*pagination.pageSize;
    tbody.innerHTML = data.map(p=>row(p)).join('');
    info.textContent = `${data.length? start+1:0}–${Math.min(start+data.length, pagination.total)} of ${pagination.total}`;
  }

  function row(p){
    const badgeCls = p.breedingAllowed ? 'badge-yes' : 'badge-no';
    const badgeTxt = p.breedingAllowed ? 'Allowed' : 'Not allowed';
    return `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${escapeHtml(p.species)}</td>
        <td>${escapeHtml(p.breed||'—')}</td>
        <td>${Number.isFinite(p.age)? p.age+'y':'—'}</td>
        <td>
          <span class="chip ${badgeCls}" data-badge>${badgeTxt}</span>
          <label style="margin-left:.5rem;display:inline-flex;align-items:center;gap:.35rem">
            <input type="checkbox" ${p.breedingAllowed?'checked':''} data-btoggle data-id="${p.id}"/>
            <small style="color:#475569">allow</small>
          </label>
        </td>
        <td>${Array.isArray(p.vaccines)? p.vaccines.join(', ') : '—'}</td>
        <td>${p.lastVisit || '—'}</td>
        <td style="text-align:right">
          <a class="btn ghost" href="/client/appointments#book?pet=${encodeURIComponent(p.name)}">❤ Book</a>
          <button class="btn secondary" data-edit data-id="${p.id}">Edit</button>
          <button class="btn danger" data-delete data-id="${p.id}">Delete</button>
        </td>
      </tr>`;
  }

  function escapeHtml(s){ return (s??'').toString().replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m])); }

  load();
})();
