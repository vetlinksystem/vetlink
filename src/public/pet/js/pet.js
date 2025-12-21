// DUMMY MODE (comment when enabling API)
const D_PETS = [
  { id:101, name:"Buddy",  breed:"Golden Retriever", species:"Dog", sex:"Male", age:2, ownerId:1, dateOfBirth:"2022-05-10", weight:"28 kg" },
  { id:102, name:"Mittens",breed:"Persian", species:"Cat", sex:"Female", age:3, ownerId:2, dateOfBirth:"2021-09-14", weight:"4.5 kg" },
  { id:103, name:"Chirpy", breed:"Cockatiel", species:"Bird", sex:"Male", age:1, ownerId:3, dateOfBirth:"2023-01-20", weight:"0.09 kg" },
  { id:104, name:"Rex",    breed:"German Shepherd", species:"Dog", sex:"Male", age:5, ownerId:1, dateOfBirth:"2020-03-08", weight:"35 kg" },
  { id:105, name:"Snowy",  breed:"Rabbit", species:"Mammal", sex:"Female", age:1, ownerId:4, dateOfBirth:"2023-02-17", weight:"2.2 kg" }
];

const qs = new URLSearchParams(location.search);
const id = Number(qs.get('id') || 0);
const el = document.getElementById('petInfo');
const p = D_PETS.find(x=>x.id===id);

if (!p) { el.innerHTML = "<em>Pet not found.</em>"; }
else {
  el.innerHTML = `
    <p><strong>Pet ID:</strong> ${p.id}</p>
    <p><strong>Name:</strong> ${p.name}</p>
    <p><strong>Breed:</strong> ${p.breed}</p>
    <p><strong>Species:</strong> ${p.species}</p>
    <p><strong>Sex:</strong> ${p.sex}</p>
    <p><strong>Age:</strong> ${p.age}</p>
    <p><strong>Date of Birth:</strong> ${p.dateOfBirth}</p>
    <p><strong>Weight:</strong> ${p.weight}</p>
    <p><strong>Owner:</strong> <a href="/employee/user?id=${p.ownerId}">View owner #${p.ownerId}</a></p>
  `;
}

// API MODE (enable later)
// fetch(`/pets/${id}`, { credentials:'include', headers:{'Accept':'application/json'} })
//   .then(r => r.ok ? r.json() : Promise.reject())
//   .then(p => { /* render like above using p */ })
//   .catch(()=> { el.innerHTML = '<em>Failed to load pet.</em>'; });
