// middlewares/upload.js
// Multer in-memory upload. Files never touch disk — the buffer is handed
// straight to Supabase Storage (see utilities/supabase.js).
const multer = require('multer');

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Images for pet/avatar; images + PDF for medical records.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
const DOC_TYPES = [...IMAGE_TYPES, 'application/pdf'];

const makeUploader = (allowed) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (req, file, cb) => {
      if (allowed.includes(file.mimetype)) return cb(null, true);
      cb(new Error('Unsupported file type.'));
    },
  });

// Single image field named "image" (pet photo / avatar).
const uploadImage = makeUploader(IMAGE_TYPES).single('image');

// Single record file named "file" (image or PDF). Optional on the route.
const uploadRecordFile = makeUploader(DOC_TYPES).single('file');

// Wrap a multer middleware so its errors become clean JSON instead of a 500.
const withUploadErrors = (mw) => (req, res, next) =>
  mw(req, res, (err) => {
    if (!err) return next();
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      success: false,
      message: tooBig ? 'File too large (max 10 MB).' : (err.message || 'Upload error.'),
    });
  });

module.exports = {
  uploadImage: withUploadErrors(uploadImage),
  uploadRecordFile: withUploadErrors(uploadRecordFile),
  MAX_BYTES,
};
