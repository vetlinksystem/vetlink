// src/routers/_front-end/client/chats_router.js
// 1:1 chat between pet owners (used to discuss breeding before proposing).
const express = require('express');
const path = require('path');
const {
  ensureAuthPage,
  ensureTypePage,
  authenticateApi,
  ensureTypeApi
} = require('../../../middlewares/auth');

const chatsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

// PAGE: /client/chats
chatsRouter.get(
  '/chats',
  ensureAuthPage,
  ensureTypePage('client'),
  (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/chats.html'));
  }
);

// APIs
const getMyConversationsController = require('../../../controllers/client/chats/get_my');
const startConversationController = require('../../../controllers/client/chats/start');
const getMessagesController = require('../../../controllers/client/chats/get_messages');
const sendMessageController = require('../../../controllers/client/chats/send_message');
const markReadController = require('../../../controllers/client/chats/mark_read');

// GET /client/chats/my
chatsRouter.get(
  '/chats/my',
  authenticateApi,
  ensureTypeApi('client'),
  getMyConversationsController
);

// POST /client/chats/start { otherClientId, myPetId?, otherPetId?, text? }
chatsRouter.post(
  '/chats/start',
  authenticateApi,
  ensureTypeApi('client'),
  startConversationController
);

// GET /client/chats/:id/messages?after=m1005
chatsRouter.get(
  '/chats/:id/messages',
  authenticateApi,
  ensureTypeApi('client'),
  getMessagesController
);

// POST /client/chats/:id/messages { text }
chatsRouter.post(
  '/chats/:id/messages',
  authenticateApi,
  ensureTypeApi('client'),
  sendMessageController
);

// PUT /client/chats/:id/read
chatsRouter.put(
  '/chats/:id/read',
  authenticateApi,
  ensureTypeApi('client'),
  markReadController
);

module.exports = chatsRouter;
