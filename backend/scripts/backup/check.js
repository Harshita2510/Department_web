// Preflight: verifies everything the nightly backup needs, without uploading anything.
//   npm run backup:check                     run all checks
//   node scripts/backup/check.js --send-test-alert   also email a test alert
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { loadBackupConfig } from './config.js';
import { mongodumpVersion } from './dump.js';
import { decryptFile, encryptFile } from './encryption.js';
import { collectStats } from './fingerprint.js';
import { createGoogleClient } from './google.js';
import { readState } from './state.js';

let failures = 0;
async function check(label, task) {
  try {
    const detail = await task();
    console.log(`  ✔ ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    failures++;
    console.log(`  ✖ ${label} — ${error.message}`);
  }
}

console.log('Website backup preflight\n');
let cfg;
await check('Configuration (.env + backup.env)', async () => {
  cfg = loadBackupConfig();
  return `database "${cfg.MONGODB_DB_NAME}", Drive folder "${cfg.BACKUP_DRIVE_FOLDER}"`;
});
if (!cfg) process.exit(1);

await check('mongodump installed', () => mongodumpVersion(cfg.MONGODUMP_PATH));

await check('MongoDB reachable', async () => {
  const client = new mongoose.mongo.MongoClient(cfg.mongoUri, { serverSelectionTimeoutMS:15_000 });
  try {
    await client.connect();
    const stats = await collectStats(client.db(cfg.MONGODB_DB_NAME));
    if (!stats.length) throw new Error(`database "${cfg.MONGODB_DB_NAME}" has no collections — check MONGODB_DB_NAME`);
    return stats.map(({ name, count }) => `${name}: ${count}`).join(', ');
  } finally {
    await client.close();
  }
});

await check('State directory writable', async () => {
  await mkdir(cfg.BACKUP_STATE_DIR, { recursive:true, mode:0o700 });
  const probe = path.join(cfg.BACKUP_STATE_DIR, '.write-test');
  await writeFile(probe, 'ok');
  await rm(probe);
  const state = await readState(cfg.BACKUP_STATE_DIR);
  return state ? `last backup ${state.lastBackupAt} (${state.lastFileName})` : 'no backup taken yet';
});

await check('Encryption round-trip', async () => {
  const dir = path.join(cfg.BACKUP_STATE_DIR, 'work');
  await mkdir(dir, { recursive:true, mode:0o700 });
  const [plain, sealed, opened] = ['check.bin', 'check.bin.enc', 'check.out'].map(name => path.join(dir, name));
  const sample = randomBytes(4096);
  try {
    await writeFile(plain, sample);
    await encryptFile(plain, sealed, cfg.BACKUP_ENCRYPTION_PASSPHRASE);
    await decryptFile(sealed, opened, cfg.BACKUP_ENCRYPTION_PASSPHRASE);
    if (!(await readFile(opened)).equals(sample)) throw new Error('decrypted data does not match');
  } finally {
    await Promise.all([plain, sealed, opened].map(file => rm(file, { force:true })));
  }
});

const google = createGoogleClient({ clientId:cfg.GOOGLE_CLIENT_ID, clientSecret:cfg.GOOGLE_CLIENT_SECRET, refreshToken:cfg.GOOGLE_REFRESH_TOKEN });
let googleOk = false;
await check('Google sign-in (refresh token)', async () => { await google.accessToken(); googleOk = true; });
if (googleOk) {
  await check('Google Drive storage', async () => {
    const quota = await google.storageQuota();
    const gb = bytes => `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    const summary = `${quota.account}: ${quota.limit === null ? 'unlimited' : `${gb(quota.free)} free of ${gb(quota.limit)}`}`;
    if (quota.free < cfg.BACKUP_LOW_SPACE_BYTES) throw new Error(`${summary} — below the low-space threshold`);
    return summary;
  });
  await check('Google Drive backup folder', async () => {
    const folderId = await google.findOrCreateFolder(cfg.BACKUP_DRIVE_FOLDER);
    const backups = await google.listBackups(folderId);
    return `${backups.length} backup(s) stored`;
  });
  if (process.argv.includes('--send-test-alert')) {
    await check(`Test alert sent to ${cfg.BACKUP_ALERT_EMAIL}`, () => google.sendEmail({
      to:cfg.BACKUP_ALERT_EMAIL, subject:'Website backup: test alert', text:'This is a test alert from "npm run backup:check". Alerts are working.'
    }));
  }
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exitCode = failures ? 1 : 0;
