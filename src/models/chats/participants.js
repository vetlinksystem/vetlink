// src/models/chats/participants.js
// Resolves conversation participants that may be pet owners OR clinic staff.
//
// Conversations were originally owner-to-owner only, so the code assumed every
// participant id was a client. The clinic asked for "Message veterinarian to customer",
// so a conversation now carries `participantTypes` alongside `participantIds`:
//
//   participantIds:   ['c1001', 'e0002']
//   participantTypes: { c1001: 'client', e0002: 'employee' }
//
// Conversations written before this existed have no participantTypes; those are treated
// as client-to-client, which is what they were.
const firestoreManager = require('../../fb/firestore_manager');

const CLIENT = 'client';
const EMPLOYEE = 'employee';

/**
 * Participant type for one id in a conversation, defaulting to 'client' for
 * conversations created before staff chat existed.
 */
const typeOf = (conversation, participantId) => {
  const map = conversation?.participantTypes || {};
  return map[String(participantId)] || CLIENT;
};

/**
 * Build the participantTypes map for a new conversation.
 */
const buildTypes = (entries) => {
  const map = {};
  (entries || []).forEach(({ id, type }) => {
    if (!id) return;
    map[String(id)] = type === EMPLOYEE ? EMPLOYEE : CLIENT;
  });
  return map;
};

/**
 * Load one participant from whichever collection it belongs to.
 * Returns a uniform shape so callers don't care which side it came from.
 */
const loadParticipant = async (id, type) => {
  if (!id) return null;
  const collection = type === EMPLOYEE ? 'employees' : 'clients';
  const doc = await firestoreManager.getData(collection, String(id));
  if (!doc) return null;
  return publicParticipant(doc, type);
};

const publicParticipant = (doc, type) => {
  if (!doc) return null;
  const isEmployee = type === EMPLOYEE;
  return {
    id: doc.id,
    type: isEmployee ? EMPLOYEE : CLIENT,
    name: doc.name || doc.fullName || doc.email || (isEmployee ? 'Clinic staff' : 'Pet owner'),
    avatarUrl: doc.avatarUrl || null,
    // Only meaningful for staff; lets the UI show "Dr. Lara Santos · Veterinarian".
    position: isEmployee ? (doc.position || doc.role || '') : ''
  };
};

/**
 * Load every participant of a conversation, keyed by id.
 * One fetch per collection rather than one per participant.
 */
const loadAllParticipants = async (conversations) => {
  const clientIds = new Set();
  const employeeIds = new Set();

  (conversations || []).forEach(c => {
    (c.participantIds || []).forEach(pid => {
      if (typeOf(c, pid) === EMPLOYEE) employeeIds.add(String(pid));
      else clientIds.add(String(pid));
    });
  });

  const [clients, employees] = await Promise.all([
    clientIds.size ? firestoreManager.getAllData('clients', {}) : [],
    employeeIds.size ? firestoreManager.getAllData('employees', {}) : []
  ]);

  const byId = {};
  (clients || []).forEach(c => {
    if (clientIds.has(String(c.id))) byId[String(c.id)] = publicParticipant(c, CLIENT);
  });
  (employees || []).forEach(e => {
    if (employeeIds.has(String(e.id))) byId[String(e.id)] = publicParticipant(e, EMPLOYEE);
  });

  return byId;
};

/**
 * Find an existing 1:1 conversation between two participants, regardless of their types.
 * (breeding/service.findConversationBetween assumes two clients; this does not.)
 */
const findConversation = async (idA, idB) => {
  const all = await firestoreManager.getAllData('conversations', {});
  const a = String(idA), b = String(idB);
  return (all || []).find(c => {
    const ids = (c.participantIds || []).map(String);
    return ids.length === 2 && ids.includes(a) && ids.includes(b);
  }) || null;
};

/**
 * Conversations this participant belongs to.
 */
const conversationsFor = async (participantId) => {
  const me = String(participantId);
  const all = await firestoreManager.getAllData('conversations', {});
  return (all || []).filter(c => (c.participantIds || []).map(String).includes(me));
};

/** Is this participant allowed in this conversation? */
const isParticipant = (conversation, participantId) =>
  (conversation?.participantIds || []).map(String).includes(String(participantId));

/** The other party in a 1:1 conversation. */
const otherIdOf = (conversation, participantId) =>
  (conversation?.participantIds || []).map(String).find(pid => pid !== String(participantId)) || '';

/**
 * True when the conversation involves clinic staff — used to label it in the UI
 * ("Clinic" vs another pet owner) and to decide the notification wording.
 */
const involvesClinic = (conversation) =>
  (conversation?.participantIds || []).some(pid => typeOf(conversation, pid) === EMPLOYEE);

module.exports = {
  CLIENT,
  EMPLOYEE,
  typeOf,
  buildTypes,
  loadParticipant,
  loadAllParticipants,
  publicParticipant,
  findConversation,
  conversationsFor,
  isParticipant,
  otherIdOf,
  involvesClinic
};
