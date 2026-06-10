// utilities/supabase.js
// Thin wrapper around Supabase Storage for uploading files (pet images,
// profile avatars, medical-record files). Metadata/URLs still live in Firestore;
// Supabase only holds the raw blobs.
//
// Required .env vars (see .env.example):
//   SUPABASE_URL          e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY  the service_role key (server-side ONLY, never in the app)
//   SUPABASE_BUCKET       storage bucket name (default 'vetlink')
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'vetlink';

let client = null;

const isConfigured = () => !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

const getClient = () => {
  if (!isConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
};

// Keep only safe characters for an object path.
const sanitize = (name) =>
  String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80);

const extFromName = (name) => {
  const m = String(name || '').match(/\.([a-zA-Z0-9]+)$/);
  return m ? `.${m[1].toLowerCase()}` : '';
};

/**
 * Upload a buffer to Supabase Storage and return its public URL.
 *
 * @param {string} folder    logical folder inside the bucket (e.g. 'pets', 'avatars', 'records')
 * @param {Buffer} buffer    file bytes (from multer memoryStorage)
 * @param {Object} opts      { originalName, mimetype, keyHint }
 * @returns {Promise<{success:boolean, url?:string, path?:string, message?:string}>}
 */
const uploadBuffer = async (folder, buffer, opts = {}) => {
  const sb = getClient();
  if (!sb) {
    return {
      success: false,
      message: 'Supabase is not configured (missing SUPABASE_URL / SUPABASE_SERVICE_KEY).',
    };
  }
  if (!buffer || !buffer.length) {
    return { success: false, message: 'Empty file.' };
  }

  const ext = extFromName(opts.originalName);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const hint = opts.keyHint ? `${sanitize(opts.keyHint)}_` : '';
  const objectPath = `${folder}/${hint}${unique}${ext}`;

  const { error } = await sb.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: opts.mimetype || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    return { success: false, message: error.message || 'Upload failed.' };
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(objectPath);
  return { success: true, url: data.publicUrl, path: objectPath };
};

module.exports = { uploadBuffer, isConfigured, BUCKET };
