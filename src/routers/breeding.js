const express = require('express');
const router = express.Router();
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../middlewares/auth');

const addBreedingController             = require('../controllers/breeding/add');
const getAllBreedingController          = require('../controllers/breeding/get_all');
const updateBreedingStatusController    = require('../controllers/breeding/update_status');
const adminDecisionController           = require('../controllers/breeding/admin_decision');
const clearanceController               = require('../controllers/breeding/clearance');
const recordDetailsController           = require('../controllers/breeding/record_details');
const pregnancy                         = require('../controllers/breeding/pregnancy');

// Admin and staff may VIEW matches and their status; only the veterinarian may act.
const { canViewBreeding, canDecideBreeding } = require('../middlewares/employee_breeding_access');

router.post('/add', ensureTypeApi('employee'), canDecideBreeding, addBreedingController);

router.get('/get-all', ensureTypeApi('employee'), canViewBreeding, getAllBreedingController);

router.put('/update-status', ensureTypeApi('client'), updateBreedingStatusController);

/* ===== Clinic decisions — VETERINARIAN ONLY =====
 * The breeding lifecycle mirrors the client's flow document:
 *
 *   pending → accepted → approved → cleared → completed
 *   (owner)   (owner)    (vet)      (vet)     (vet)
 */

// Step 6/8: final decision on a pair both owners agreed on.
// PUT /breeding/admin-decision
//   { id, decision: 'approve'|'approve_with_conditions'|'reject'|'complete', notes?, conditions? }
router.put('/admin-decision', ensureTypeApi('employee'), canDecideBreeding, adminDecisionController);

// Step 9: final pre-breeding health examination of both pets.
// PUT /breeding/clearance { id, petAFit, petBFit, findings?, notes? }
router.put('/clearance', ensureTypeApi('employee'), canDecideBreeding, clearanceController);

// Step 10: the breeding record (sire/dam, date, mating type, stud fee, litter size…).
// PUT /breeding/record { id, breedingDate, matingType, numberOfMating, ... }
router.put('/record', ensureTypeApi('employee'), canDecideBreeding, recordDetailsController);

/* ===== Post-breeding care ===== */

// Pregnancy status + monitoring check-ups.
// PUT /breeding/pregnancy { id, pregnancyStatus?, stepKey?, stepStatus?, ... }
router.put('/pregnancy', ensureTypeApi('employee'), canDecideBreeding, pregnancy.updateController);

// Offspring records.
// PUT /breeding/offspring { id, deliveryDate, offspring: [...] }
router.put('/offspring', ensureTypeApi('employee'), canDecideBreeding, pregnancy.offspringController);

// Check-ups due or overdue — readable by admin/staff/vet for the dashboard.
router.get('/checkups-due', ensureTypeApi('employee'), canViewBreeding, pregnancy.dueController);

// Send check-up reminders. Idempotent per due date, so it is safe to call on a schedule.
router.post('/send-reminders', ensureTypeApi('employee'), canDecideBreeding, pregnancy.remindersController);

module.exports = router;
