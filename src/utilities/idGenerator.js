// utilities/idGenerator.js
const db = require('../fb/firestore_config');

/**
 * Get the next numeric counter for a given key using a Firestore transaction.
 * This guarantees that each call receives a unique, incrementing number.
 *
 * @param {string} key - The counter document id (e.g. 'pets', 'employees')
 * @param {number} startAt - First usable number (default 1001 → p1001, e1001, etc.)
 * @returns {Promise<number>} next value for the counter
 */
const getNextCounter = async (key, startAt = 1001) => {
  const counterRef = db.collection('counters').doc(key);

  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);

    let current = startAt - 1;
    if (doc.exists && typeof doc.data().value === 'number') {
      current = doc.data().value;
    }

    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });

    return next;
  });

  return result;
};

const generateIdWithPrefix = async (prefix, key) => {
  const seq = await getNextCounter(key);
  return `${prefix}${seq}`;   // e.g. 'p1001'
};

const generatePetId = async () => {
  return await generateIdWithPrefix('p', 'pets');
};

const generateBreedingId = async () => {
  return await generateIdWithPrefix('b', 'breeding');
};

const generateEmployeeId = async () => {
  return await generateIdWithPrefix('e', 'employees');
};

const generateClientId = async () => {
  return await generateIdWithPrefix('c', 'clients');
};

const generateAppointmentId = async () => {
  return await generateIdWithPrefix('a', 'appointments');
};

// Notifications (n1001, n1002, ...)
const generateNotificationId = async () => {
  return await generateIdWithPrefix('n', 'notifications');
};

module.exports = {
  getNextCounter,
  generatePetId,
  generateBreedingId,
  generateEmployeeId,
  generateClientId,
  generateAppointmentId,
  generateNotificationId,
};
