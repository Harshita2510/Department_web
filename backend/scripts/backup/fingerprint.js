import { createHash } from 'node:crypto';

// Audit entries are written on every admin action, so they would mark the data "changed" without
// any website content changing. They are still included in every dump.
const IGNORED_COLLECTIONS = new Set(['auditlogs']);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function collectStats(db) {
  const collections = await db.listCollections({ type:'collection' }, { nameOnly:true }).toArray();
  const stats = [];
  for (const { name } of collections) {
    if (name.startsWith('system.') || IGNORED_COLLECTIONS.has(name)) continue;
    const collection = db.collection(name);
    const [count, newest, latestUpdate] = await Promise.all([
      collection.countDocuments(),
      collection.find({}, { projection:{ _id:1 } }).sort({ _id:-1 }).limit(1).next(),
      collection.find({ updatedAt:{ $exists:true } }, { projection:{ updatedAt:1 } }).sort({ updatedAt:-1 }).limit(1).next()
    ]);
    stats.push({ name, count, newestId:newest ? String(newest._id) : null, latestUpdate:latestUpdate ? new Date(latestUpdate.updatedAt).toISOString() : null });
  }
  return stats;
}

export function fingerprintFromStats(stats) {
  const ordered = [...stats].sort((a, b) => a.name.localeCompare(b.name));
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
}

// Returns why a backup is needed tonight, or null to skip.
export function backupReason({ now, state, fingerprint }) {
  if (!state?.lastBackupAt) return 'first-backup';
  if (state.fingerprint !== fingerprint) return 'data-changed';
  const last = new Date(state.lastBackupAt);
  if (now.getDay() === 0 && last.toDateString() !== now.toDateString()) return 'weekly';
  if (now - last >= WEEK_MS) return 'overdue';
  return null;
}
