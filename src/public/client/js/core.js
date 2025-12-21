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
