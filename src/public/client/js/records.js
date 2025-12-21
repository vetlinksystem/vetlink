/* ===========================================================
   📡 RECORDS — API CONTRACT
   -----------------------------------------------------------

   GET /api/client/records?search=&type=
   → {
       "data": [
         { "id":501, "pet":"Buddy","type":"Vaccination Card",
           "date":"2025-10-02","url":"/uploads/x.pdf" }
       ]
     }

   POST /api/client/records
   FormData: { file, petId, type, note }
   → { "success": true, "id":999, "url":"/uploads/...pdf" }

   DELETE /api/client/records/:id
   → { "success": true }
   =========================================================== */

(function ensureApi(){
  if(!window.API) window.API = {};

  if(!API.listRecords){
    API.listRecords = async ()=>{
      return { data:[
        {id:501,pet:'Buddy',type:'Vaccination Card',date:'2025-10-02',url:'#'},
        {id:502,pet:'Mochi',type:'Lab Result',date:'2025-09-20',url:'#'},
      ]};
    };
  }

  if(!API.uploadRecord){
    API.uploadRecord = async formData=>{
      return { success:true, id:Date.now(), url:'#' };
    };
  }

  if(!API.deleteRecord){
    API.deleteRecord = async id=>{
      return { success:true };
    };
  }

  if(!API.listPets){
    API.listPets = async()=>({ data:[
      {id:1,name:'Buddy'},
      {id:2,name:'Mochi'}
    ]});
  }
})();



(function ui(){

  const listEl = document.getElementById('recList');
  const searchEl = document.getElementById('recSearch');

  document.getElementById('notifBtn').addEventListener('click', ()=>theToast('No new notifications'));

  searchEl.addEventListener('input', ()=>render());

  document.getElementById('uploadBtn').addEventListener('click', openUploadModal);
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', closeUploadModal));
  document.getElementById('uSubmit').addEventListener('click', uploadRecord);

  load();

  async function load(){ render(); }

  async function render(){
    const search = searchEl.value.trim().toLowerCase();
    const resp = await API.listRecords({ search });

    let items = resp.data || [];
    if(search){
      items = items.filter(r =>
        r.pet.toLowerCase().includes(search) ||
        r.type.toLowerCase().includes(search)
      );
    }

    listEl.innerHTML = items.length
      ? items.map(recordCard).join('')
      : `<div style="padding:1rem;color:#6b7280">No records found.</div>`;
  }

  function recordCard(r){
    return `
      <div class="record-card">
        <div class="chip">${escape(r.pet)}</div>
        <strong>${escape(r.type)}</strong>
        <small style="color:#6b7280">${r.date}</small>

        <div class="actions">
          <a class="btn secondary" href="${r.url}" target="_blank">Download</a>
          <button class="btn ghost" data-del="${r.id}">Delete</button>
        </div>
      </div>
    `;
  }

  document.addEventListener('click', async e=>{
    const id = e.target.getAttribute('data-del');
    if(id){
      await API.deleteRecord(Number(id));
      theToast('Record deleted');
      render();
    }
  });

  async function openUploadModal(){
    // Load pet list
    const {data} = await API.listPets();
    const sel = document.getElementById('uPet');
    sel.innerHTML = '<option>Choose pet…</option>' + data.map(p=>`
      <option value="${p.id}">${escape(p.name)}</option>
    `).join('');

    document.getElementById('uploadModal').classList.add('show');
  }

  function closeUploadModal(){
    document.getElementById('uploadModal').classList.remove('show');
  }

  async function uploadRecord(){
    const formData = new FormData();
    formData.append('petId', document.getElementById('uPet').value);
    formData.append('type', document.getElementById('uType').value);
    formData.append('file', document.getElementById('uFile').files[0]);
    formData.append('note', document.getElementById('uNote').value);

    if(!formData.get('petId') || !formData.get('file')){
      theToast('Please complete required fields');
      return;
    }

    await API.uploadRecord(formData);
    closeUploadModal();
    theToast('Record uploaded');
    render();
  }

  function escape(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }

})();
