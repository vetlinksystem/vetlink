// src/routers/_front-end/client/breeding_router.js
// Client-driven breeding: find a match, propose, respond, withdraw.
const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');

const breedingRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

// PAGE: /client/breeding
breedingRouter.get(
  '/breeding',
  ensureAuthPage,
  ensureTypePage('client'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/breeding.html'));
  }
);

// APIs
const candidatesController = require('../../../controllers/client/breeding/candidates');
const proposeController = require('../../../controllers/client/breeding/propose');
const getMyProposalsController = require('../../../controllers/client/breeding/get_my');
const respondBreedingController = require('../../../controllers/client/breeding/respond');
const cancelController = require('../../../controllers/client/breeding/cancel');

// GET /client/breeding/candidates?petId=p1001
breedingRouter.get(
  '/breeding/candidates',
  authenticateApi,
  ensureTypeApi('client'),
  candidatesController
);

// POST /client/breeding/propose { myPetId, targetPetId, message?, conversationId? }
breedingRouter.post(
  '/breeding/propose',
  authenticateApi,
  ensureTypeApi('client'),
  proposeController
);

// GET /client/breeding/my
breedingRouter.get(
  '/breeding/my',
  authenticateApi,
  ensureTypeApi('client'),
  getMyProposalsController
);

// PUT /client/breeding/respond { id, decision: 'accept'|'decline' }
breedingRouter.put(
  '/breeding/respond',
  authenticateApi,
  ensureTypeApi('client'),
  respondBreedingController
);

// PUT /client/breeding/cancel { id }
breedingRouter.put(
  '/breeding/cancel',
  authenticateApi,
  ensureTypeApi('client'),
  cancelController
);

module.exports = breedingRouter;
