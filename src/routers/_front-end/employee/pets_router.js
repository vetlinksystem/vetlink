const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');
const { requirePermission } = require('../../../middlewares/require_permission');

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

// ===== Pet Records page ("Pet Records containing records of all pets") =====
managePetsRouter.get('/pet-records', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/pet_register.html'));
});

// ===== Pet Details API =====
const getPetDetails = require('../../../controllers/employee/pets/get_pet_details');
managePetsRouter.get('/pets/get', authenticateApi, ensureTypeApi('employee'), getPetDetails);

// ===== Pet register API (clinic-wide list of every pet) =====
const getPetRegister = require('../../../controllers/employee/pets/get_pet_register');
managePetsRouter.get(
    '/pets/register',
    authenticateApi,
    ensureTypeApi('employee'),
    requirePermission('pets.view'),
    getPetRegister
);

// ===== Medical records (employee scope) =====
// NOTE: pet PHOTO upload is intentionally client-only; employees can only
// view the photo and manage medical records.
const getPetRecordsController = require('../../../controllers/employee/records/get_pet_records');
const addRecordController = require('../../../controllers/employee/records/add_record');
const { uploadRecordFile } = require('../../../middlewares/upload');

// GET /employee/pets/:id/records — admin, staff and vet may all read (and print).
managePetsRouter.get(
  '/pets/:id/records',
  authenticateApi,
  ensureTypeApi('employee'),
  requirePermission('records.view'),
  getPetRecordsController
);

// POST /employee/pets/:id/records  (multipart; text fields + optional "file")
// Only veterinarians and administrators may create records — staff are view/print only.
managePetsRouter.post(
  '/pets/:id/records',
  authenticateApi,
  ensureTypeApi('employee'),
  requirePermission('records.manage'),
  uploadRecordFile,
  addRecordController
);

module.exports = managePetsRouter;