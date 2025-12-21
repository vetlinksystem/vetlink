const express = require('express');
const router = express.Router();
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../middlewares/auth');

const addBreedingController             = require('../controllers/breeding/add');
const getAllBreedingController          = require('../controllers/breeding/get_all');
const updateBreedingStatusController    = require('../controllers/breeding/update_status');

router.post('/add', ensureTypeApi('employee'), addBreedingController);

router.get('/get-all', ensureTypeApi('employee'), getAllBreedingController);

router.put('/update-status', ensureTypeApi('client'), updateBreedingStatusController);

module.exports = router;
