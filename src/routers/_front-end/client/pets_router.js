// src/routers/_front-end/client/pets_router.js
const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');

const petsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

petsRouter.use(express.static(publicPath));

// PAGE: /client/pets
petsRouter.get(
  '/pets',
  ensureAuthPage,
  ensureTypePage('client'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/pets.html'));
  }
);

// API: /client/pets/my
const getMyPetsController = require('../../../controllers/client/pets/get_my_pets');
const addClientPetController = require('../../../controllers/client/pets/add_pet');

petsRouter.get(
  '/pets/my',
  authenticateApi,
  ensureTypeApi('client'),
  getMyPetsController
);

// API: POST /client/pets  (create pet owned by logged-in client)
petsRouter.post(
  '/pets',
  authenticateApi,
  ensureTypeApi('client'),
  addClientPetController
);

module.exports = petsRouter;
