const firestoreManager = require('../../../fb/firestore_manager');
const { uploadBuffer } = require('../../../utilities/supabase');

/**
 * Upload a profile picture for the logged-in client and save its URL.
 *
 * @param {string} clientId  client id (from token)
 * @param {Object} file      multer file { buffer, originalname, mimetype }
 */
const uploadAvatar = async (clientId, file) => {
  if (!clientId) return { success: false, message: 'Missing client id.' };
  if (!file || !file.buffer) return { success: false, message: 'No image uploaded.' };

  const up = await uploadBuffer('avatars', file.buffer, {
    originalName: file.originalname,
    mimetype: file.mimetype,
    keyHint: clientId,
  });
  if (!up.success) return { success: false, message: up.message };

  const ok = await firestoreManager.updatePartialData('clients', {
    id: clientId,
    avatarUrl: up.url,
  });
  if (!ok) return { success: false, message: 'Failed to save avatar URL.' };

  return { success: true, avatarUrl: up.url };
};

module.exports = uploadAvatar;
