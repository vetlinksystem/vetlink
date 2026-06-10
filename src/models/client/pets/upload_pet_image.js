const firestoreManager = require('../../../fb/firestore_manager');
const { uploadBuffer } = require('../../../utilities/supabase');

/**
 * Upload a photo for a pet owned by the logged-in client and save its URL.
 *
 * @param {string} clientId  owner id (from token)
 * @param {string} petId     pet doc id
 * @param {Object} file      multer file { buffer, originalname, mimetype }
 */
const uploadPetImage = async (clientId, petId, file) => {
  if (!clientId) return { success: false, message: 'Missing client id.' };
  if (!petId) return { success: false, message: 'Missing pet id.' };
  if (!file || !file.buffer) return { success: false, message: 'No image uploaded.' };

  // Verify the pet exists and belongs to this client.
  const pet = await firestoreManager.getData('pets', petId);
  if (!pet) return { success: false, message: 'Pet not found.' };
  if (pet.ownerId !== clientId) return { success: false, message: 'Not authorized for this pet.' };

  const up = await uploadBuffer('pets', file.buffer, {
    originalName: file.originalname,
    mimetype: file.mimetype,
    keyHint: petId,
  });
  if (!up.success) return { success: false, message: up.message };

  const ok = await firestoreManager.updatePartialData('pets', {
    id: petId,
    imageUrl: up.url,
  });
  if (!ok) return { success: false, message: 'Failed to save image URL.' };

  return { success: true, imageUrl: up.url };
};

module.exports = uploadPetImage;
