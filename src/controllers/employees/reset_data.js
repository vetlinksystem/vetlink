const db = require('../../fb/firestore_config');
const { resolveRole, ROLES } = require('../../utilities/roles');
const supabase = require('../../utilities/supabase');

// Everything the clinic generates. Employees are handled separately (admins are kept).
const WIPE_COLLECTIONS = [
    'clients', 'pets', 'appointments', 'records', 'breeding',
    'conversations', 'messages', 'notifications'
];
// ID counters that restart, so new data begins at c1001, p1001, a1001, …
// The employees counter is kept because admin accounts (and their ids) remain.
const RESET_COUNTERS = [...WIPE_COLLECTIONS, 'files'];
// Supabase Storage folders written by utilities/supabase.js uploadBuffer().
const STORAGE_FOLDERS = ['pets', 'avatars', 'records'];

const CONFIRM_WORD = 'RESET';

/** Delete documents in batches of 400 (Firestore allows 500 writes per batch). */
const deleteDocs = async (refs) => {
    for (let i = 0; i < refs.length; i += 400) {
        const batch = db.batch();
        refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
        await batch.commit();
    }
    return refs.length;
};

/** Remove every object under each storage folder. Returns { removed, error? }. */
const wipeStorage = async () => {
    const sb = supabase.getClient();
    if (!sb) return { removed: 0, error: 'File storage is not configured.' };
    const bucket = sb.storage.from(supabase.BUCKET);

    let removed = 0;
    try {
        for (const folder of STORAGE_FOLDERS) {
            // list() pages at 100; keep listing until the folder is empty.
            for (;;) {
                const { data, error } = await bucket.list(folder, { limit: 100 });
                if (error) throw error;
                const paths = (data || []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
                if (!paths.length) break;
                const { error: rmError } = await bucket.remove(paths);
                if (rmError) throw rmError;
                removed += paths.length;
            }
        }
        return { removed };
    } catch (err) {
        console.error('Reset: storage wipe failed', err);
        return { removed, error: err.message || 'File storage could not be reached.' };
    }
};

/**
 * POST /employees/reset-data  { confirm: "RESET" }
 *
 * Wipes all clinic data: clients, pets, appointments, records, breeding, chats,
 * notifications, every non-admin employee, and the uploaded files. Admin accounts are
 * kept so the clinic can still sign in. Admin only (system.reset). Cannot be undone.
 */
const resetDataController = async (req, res) => {
    try {
        if (String(req.body?.confirm || '') !== CONFIRM_WORD) {
            return res.status(400).json({ success: false, message: `Type ${CONFIRM_WORD} to confirm the reset.` });
        }

        const deleted = {};

        for (const name of WIPE_COLLECTIONS) {
            const snap = await db.collection(name).get();
            deleted[name] = await deleteDocs(snap.docs.map((d) => d.ref));
        }

        // Employees: keep every admin, and always the admin doing the reset.
        const empSnap = await db.collection('employees').get();
        const nonAdmins = empSnap.docs.filter((d) =>
            d.id !== String(req.user?.id) && resolveRole(d.data()) !== ROLES.ADMIN);
        deleted.employees = await deleteDocs(nonAdmins.map((d) => d.ref));

        await deleteDocs(RESET_COUNTERS.map((key) => db.collection('counters').doc(key)));

        const storage = await wipeStorage();
        deleted.files = storage.removed;

        console.warn(`Data reset by ${req.user?.id}:`, JSON.stringify(deleted));

        return res.json({
            success: true,
            deleted,
            message: storage.error
                ? `All data was reset, but uploaded files could not be removed: ${storage.error}`
                : 'All data was reset.'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while resetting data. Some data may already have been removed.',
            error: error.message
        });
    }
};

module.exports = resetDataController;
