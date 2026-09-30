const express = require('express');
const petsRouters = express.Router();

const addPetsController = require('../controllers/pets/add');
const getPetsController = require('../controllers/pets/get');
const getAllPetsController = require('../controllers/pets/get_all');
const updatePetsController = require('../controllers/pets/update');
const deletePetsController = require('../controllers/pets/delete');
const { requirePermission } = require('../middlewares/require_permission');

petsRouters.post('/add', addPetsController);
petsRouters.put('/get', getPetsController);
petsRouters.get('/get-all', getAllPetsController);
petsRouters.put('/update', updatePetsController);
// Removing a pet from the clinic's list is admin only.
petsRouters.delete('/delete', requirePermission('pets.delete'), deletePetsController);

module.exports = petsRouters;