const express = require('express');
const router = express.Router();

const getScheduleRangeController = require('../controllers/employee/schedule/get_range');

router.get('/', getScheduleRangeController);

module.exports = router;
