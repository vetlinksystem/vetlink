/* ===========================================================
   📡 DASHBOARD — EXPECTED API RESPONSES
   -----------------------------------------------------------
   1) Appointments
      GET /api/client/appointments?status=
      → {
          "data": [
            {
              "id": 101,
              "pet": "Buddy",
              "service": "Vaccination",
              "date": "2025-11-20",   // YYYY-MM-DD
              "time": "09:00",        // HH:mm (24h)
              "status": "Pending" | "Confirmed" | "Completed" | "Cancelled"
            }
          ]
        }

   2) Pets
      GET /api/client/pets?search=&page=1&pageSize=10
      → {
          "data": [
            { "id": 1, "name": "Buddy", ... }
          ],
          "pagination": { "page": 1, "pageSize": 10, "total": 2 }
        }

   3) Records
      GET /api/client/records
      → {
          "data": [
            { "id": 501, "pet": "Buddy", "type": "Vaccination Card", "date": "2025-10-02", "url": "/files/..." }
          ]
        }
   =========================================================== */

(function ensureApi(){
  if(!window.API) window.API = {};
  const basePath = '/api/client';

  // Minimal safe mocks; remove once wired to backend.
  if(!API.listAppointments){
    API.listAppointments = async (params = {})=>{
      return {
        data: [
          { id:101, pet:'Buddy', service:'Vaccination', date:'2025-11-20', time:'09:00', status:'Confirmed' },
          { id:102, pet:'Mochi', service:'Grooming',   date:'2025-11-28', time:'14:30', status:'Pending' }
        ]
      };
      // REAL:
      // const qs = new URLSearchParams(params);
      // return fetch(`${basePath}/appointments?${qs}`).then(r => r.json());
    };
  }

  if(!API.listPets){
    API.listPets = async (params = {})=>{
      return {
        data: [
          { id:1, name:'Buddy' },
          { id:2, name:'Mochi' }
        ],
        pagination: { page:1, pageSize:10, total:2 }
      };
      // REAL:
      // const qs = new URLSearchParams(params);
      // return fetch(`${basePath}/pets?${qs}`).then(r => r.json());
    };
  }

  if(!API.listRecords){
    API.listRecords = async ()=>{
      return {
        data: [
          { id:501, pet:'Buddy', type:'Vaccination Card', date:'2025-10-02', url:'#' },
          { id:502, pet:'Mochi', type:'Lab Result',       date:'2025-09-20', url:'#' }
        ]
      };
      // REAL:
      // return fetch(`${basePath}/records`).then(r => r.json());
    };
  }
})();

(async function ui(){
  const statsEl = document.getElementById('stats');

  // Topbar actions
  document.getElementById('notifBtn').addEventListener('click', () => theToast('No new notifications'));
  document.getElementById('bookBtn').addEventListener('click', () => { location.href = '/client/appointments#book'; });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    // hook to real logout later
    theToast('Logging out…');
  });

  // Load dashboard data in parallel
  const [apts, pets, recs] = await Promise.all([
    API.listAppointments({}),
    API.listPets({}),
    API.listRecords({})
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const allApts   = apts?.data  || [];
  const allPets   = pets?.data  || [];
  const allRecs   = recs?.data  || [];
  const petsTotal = pets?.pagination?.total ?? allPets.length;

  // 1) Next upcoming appointment
  const upcoming = allApts
    .filter(a => a.date >= today && a.status !== 'Completed' && a.status !== 'Cancelled')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  // 2) Pending appointments only
  const pendingCount = allApts.filter(a => a.status === 'Pending').length;

  // 3) Pets count
  const petsCount = petsTotal;

  // 4) Records count
  const recordsCount = allRecs.length;

  statsEl.innerHTML = `
    <div class="card stat">
      <div class="chip">Upcoming</div>
      <h3>Next appointment</h3>
      <div class="value">
        ${upcoming ? `${esc(upcoming.pet)} • ${esc(upcoming.service)}` : '—'}
      </div>
      <small>
        ${upcoming ? `${upcoming.date} at ${upcoming.time}` : 'No upcoming visits. Book one below.'}
      </small>
    </div>

    <div class="card stat">
      <div class="chip">Requests</div>
      <h3>Pending appointments</h3>
      <div class="value">${pendingCount}</div>
      <small>Waiting for clinic confirmation.</small>
    </div>

    <div class="card stat">
      <div class="chip">Pets</div>
      <h3>Registered pets</h3>
      <div class="value">${petsCount}</div>
      <small>Manage them in <a href="/client/pets">My Pets</a>.</small>
    </div>

    <div class="card stat">
      <div class="chip">Records</div>
      <h3>Medical records</h3>
      <div class="value">${recordsCount}</div>
      <small>View or download from <a href="/client/records">Records</a>.</small>
    </div>
  `;

  function esc(s){
    return (s ?? '').toString().replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }
})();
