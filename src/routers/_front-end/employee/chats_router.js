const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');
const { loadEmployeeRole } = require('../../../middlewares/require_permission');

const chatsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

chatsRouter.use(express.static(publicPath));

/**
 * Clinic-side messaging with pet owners ("Message veterinarian to costumer").
 *
 * Every employee role may message owners — a receptionist confirming a booking is as
 * legitimate as a vet explaining a result — so these routes need only an authenticated
 * employee. `loadEmployeeRole` is applied so the handler knows who is writing (the
 * sender's name and role are shown to the owner).
 */

// PAGE: /employee/messages
chatsRouter.get(
  '/messages',
  ensureAuthPage,
  ensureTypePage('employee'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/messages.html'));
  }
);

const chats = require('../../../controllers/employee/chats');

chatsRouter.get('/chats/my',
  authenticateApi, ensureTypeApi('employee'), loadEmployeeRole, chats.getMy);

chatsRouter.post('/chats/start',
  authenticateApi, ensureTypeApi('employee'), loadEmployeeRole, chats.start);

chatsRouter.get('/chats/:id/messages',
  authenticateApi, ensureTypeApi('employee'), loadEmployeeRole, chats.getMessages);

chatsRouter.post('/chats/:id/messages',
  authenticateApi, ensureTypeApi('employee'), loadEmployeeRole, chats.sendMessage);

chatsRouter.put('/chats/:id/read',
  authenticateApi, ensureTypeApi('employee'), loadEmployeeRole, chats.markRead);

module.exports = chatsRouter;
