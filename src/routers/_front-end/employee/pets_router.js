const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const managePetsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

managePetsRouter.use(express.static(publicPath));

managePetsRouter.get('/pets', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/pets.html'));
});

// ===== Pet Details Page =====
// Used by links like /employee/pet?id=...
managePetsRouter.get('/pet', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'pet/html/pet.html'));
});

// ===== Pet Details API =====
const getPetDetails = require('../../../controllers/employee/pets/get_pet_details');
managePetsRouter.get('/pets/get', authenticateApi, ensureTypeApi('employee'), getPetDetails);

module.exports = managePetsRouter;