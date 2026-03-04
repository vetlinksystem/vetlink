const express = require('express');
const router = express.Router();
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../middlewares/auth');

const addBreedingController             = require('../controllers/breeding/add');
const getAllBreedingController          = require('../controllers/breeding/get_all');
const updateBreedingStatusController    = require('../controllers/breeding/update_status');
const ensureEmployeeBreedingAccess      = require('../middlewares/employee_breeding_access');

router.post('/add', ensureTypeApi('employee'), ensureEmployeeBreedingAccess, addBreedingController);

router.get('/get-all', ensureTypeApi('employee'), ensureEmployeeBreedingAccess, getAllBreedingController);

router.put('/update-status', ensureTypeApi('client'), updateBreedingStatusController);

module.exports = router;
