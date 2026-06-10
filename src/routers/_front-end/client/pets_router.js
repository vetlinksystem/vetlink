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
const updateClientPetController = require('../../../controllers/client/pets/update_pet');
const deleteClientPetController = require('../../../controllers/client/pets/delete_pet');
const uploadPetImageController = require('../../../controllers/client/pets/upload_pet_image');
const { uploadImage } = require('../../../middlewares/upload');

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

// API: PUT /client/pets/:id (update)
petsRouter.put(
  '/pets/:id',
  authenticateApi,
  ensureTypeApi('client'),
  updateClientPetController
);

// API: DELETE /client/pets/:id (delete)
petsRouter.delete(
  '/pets/:id',
  authenticateApi,
  ensureTypeApi('client'),
  deleteClientPetController
);

// API: POST /client/pets/:id/image (multipart, field "image")
petsRouter.post(
  '/pets/:id/image',
  authenticateApi,
  ensureTypeApi('client'),
  uploadImage,
  uploadPetImageController
);

module.exports = petsRouter;
