// DUMMY MODE (comment when enabling API)
const D_USERS = [
  { id:1, name:"Ken Lloyd Billones", address:"Tagum City, Davao del Norte", email:"kenlloyd@example.com", number:"0917-123-4567" },
  { id:2, name:"Rena Rita", address:"Davao City", email:"renarita@example.com", number:"0918-987-6543" },
  { id:3, name:"Mario Toledo", address:"Panabo City", email:"mariotoledo@example.com", number:"0908-654-3210" },
  { id:4, name:"Alyssa Cruz", address:"Carmen, Davao del Norte", email:"alyssa.cruz@example.com", number:"0927-112-3344" },
  { id:5, name:"Joana Dela Peña", address:"Mabini, Davao de Oro", email:"joana.dp@example.com", number:"0919-443-2288" }
];
const D_PETS = [
  { id:101, name:"Buddy",  breed:"Golden Retriever", species:"Dog",  sex:"Male",   age:2, ownerId:1, dateOfBirth:"2022-05-10", weight:"28 kg" },
  { id:102, name:"Mittens",breed:"Persian",          species:"Cat",  sex:"Female", age:3, ownerId:2, dateOfBirth:"2021-09-14", weight:"4.5 kg" },
  { id:103, name:"Chirpy", breed:"Cockatiel",        species:"Bird", sex:"Male",   age:1, ownerId:3, dateOfBirth:"2023-01-20", weight:"0.09 kg" },
  { id:104, name:"Rex",    breed:"German Shepherd",  species:"Dog",  sex:"Male",   age:5, ownerId:1, dateOfBirth:"2020-03-08", weight:"35 kg" },
  { id:105, name:"Snowy",  breed:"Rabbit",           species:"Mammal",sex:"Female",age:1, ownerId:4, dateOfBirth:"2023-02-17", weight:"2.2 kg" }
];

const qs = new URLSearchParams(location.search);
const id = Number(qs.get('id') || 0);

const user = D_USERS.find(c=>c.id===id);
const userInfo = document.getElementById('userInfo');
const userPets = document.getElementById('userPets');

if (!user){ userInfo.innerHTML = "<em>User not found.</em>"; }
else{
  userInfo.innerHTML = `
    <p><strong>ID:</strong> ${user.id}</p>
    <p><strong>Name:</strong> ${user.name}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Contact No.:</strong> ${user.number}</p>
    <p><strong>Address:</strong> ${user.address}</p>
  `;
  const rows = D_PETS.filter(p=>p.ownerId===user.id);
  const thead = '<thead><tr><th>ID</th><th>Name</th><th>Breed</th><th>Species</th><th>Sex</th><th>Age</th><th>DOB</th><th>Weight</th></tr></thead>';
  const tbody = '<tbody>' + rows.map(p => `
    <tr>
      <td><a href="/employee/pet?id=${p.id}">${p.id}</a></td>
      <td>${p.name}</td><td>${p.breed}</td><td>${p.species}</td>
      <td>${p.sex}</td><td>${p.age}</td><td>${p.dateOfBirth}</td><td>${p.weight}</td>
    </tr>`).join('') + '</tbody>';
  userPets.innerHTML = thead + tbody;
}

// API MODE (enable later)
// fetch(`/clients/${id}?include=pets&details=full`, { credentials:'include', headers:{'Accept':'application/json'} })
//   .then(r => r.ok ? r.json() : Promise.reject())
//   .then(u => { /* render like above using u + u.pets */ })
//   .catch(()=> { userInfo.innerHTML = '<em>Failed to load user.</em>'; });
