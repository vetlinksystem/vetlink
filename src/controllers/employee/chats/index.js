// src/controllers/employee/chats/index.js
// Clinic-side messaging with pet owners ("Message veterinarian to costumer").
//
// Reading messages and marking a thread read reuse the client-side models, which are
// already participant-type agnostic — they check membership by id, not by role.
const getMyModel = require('../../../models/employee/chats/get_my');
const startModel = require('../../../models/employee/chats/start');
const sendModel = require('../../../models/employee/chats/send_message');
const getMessagesModel = require('../../../models/client/chats/get_messages');
const markReadModel = require('../../../models/client/chats/mark_read');

const employeeFrom = (req) => ({
  id: req.user?.id,
  name: req.employee?.name || req.employee?.fullName || req.user?.name || ''
});

const fail = (res, result, fallback, status = 400) =>
  res.status(status).json({ success: false, message: result?.message || fallback });

const serverError = (res, error, what) => {
  console.error(`employee chats ${what} error`, error);
  return res.status(500).json({
    success: false,
    message: `Server error while ${what}.`,
    error: error.message
  });
};

// GET /employee/chats/my
const getMy = async (req, res) => {
  try {
    const result = await getMyModel(req.user?.id);
    if (!result || result.success === false) return fail(res, result, 'Unable to load conversations.');
    return res.json(result);
  } catch (error) {
    return serverError(res, error, 'loading conversations');
  }
};

// POST /employee/chats/start  { clientId, petId?, text? }
const start = async (req, res) => {
  try {
    const result = await startModel(employeeFrom(req), req.body || {});
    if (!result || result.success === false) return fail(res, result, 'Unable to start the conversation.');
    return res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    return serverError(res, error, 'starting the conversation');
  }
};

// GET /employee/chats/:id/messages?after=<messageId>
const getMessages = async (req, res) => {
  try {
    const result = await getMessagesModel(req.user?.id, req.params.id, { after: req.query?.after });
    if (!result || result.success === false) return fail(res, result, 'Unable to load messages.', 403);
    return res.json(result);
  } catch (error) {
    return serverError(res, error, 'loading messages');
  }
};

// POST /employee/chats/:id/messages  { text }
const sendMessage = async (req, res) => {
  try {
    const result = await sendModel(employeeFrom(req), req.params.id, req.body || {});
    if (!result || result.success === false) return fail(res, result, 'Unable to send the message.');
    return res.status(201).json(result);
  } catch (error) {
    return serverError(res, error, 'sending the message');
  }
};

// PUT /employee/chats/:id/read
const markRead = async (req, res) => {
  try {
    const result = await markReadModel(req.user?.id, req.params.id);
    if (!result || result.success === false) return fail(res, result, 'Unable to mark as read.', 403);
    return res.json(result);
  } catch (error) {
    return serverError(res, error, 'marking the conversation read');
  }
};

module.exports = { getMy, start, getMessages, sendMessage, markRead };
