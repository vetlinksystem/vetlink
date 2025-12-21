const express = require('express');
const reservationsRouter = express.Router();

const addReservationController     = require('../controllers/reservations/add');
const getAllReservationsController = require('../controllers/reservations/get_all');
const updateReservationController  = require('../controllers/reservations/update');

// GET /reservations?limit=100&offset=0
reservationsRouter.get('/', getAllReservationsController);

// POST /reservations
reservationsRouter.post('/', addReservationController);

// PUT /reservations/:id
reservationsRouter.put('/:id', updateReservationController);

module.exports = reservationsRouter;
