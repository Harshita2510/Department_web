// Nightly entry point (cron). Backs up the whole website database, GridFS files included, only when
// something changed since the last backup, plus a forced backup every Sunday.
//   node scripts/backup/run.js           normal nightly run
//   node scripts/backup/run.js --force   back up now regardless of changes
import { mkdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { loadBackupConfig } from './config.js';
import { dumpDatabase } from './dump.js';
import { encryptFile } from './encryption.js';
import { backupReason, collectStats, fingerprintFromStats } from './fingerprint.js';
import { BACKUP_FILE_PREFIX, createGoogleClient } from './google.js';
import { selectExpired } from './retention.js';
import { readState, writeState } from './state.js';

const log = message => console.log(`[${new Date().toISOString()}] ${message}`);
const megabytes = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function computeFingerprint(cfg) {
  const client = new mongoose.mongo.MongoClient(cfg.mongoUri, { serverSelectionTimeoutMS:15_000 });
  try {
    await client.connect();
    return fingerprintFromStats(await collectStats(client.db(cfg.MONGODB_DB_NAME)));
  } finally {
    await client.close();
  }
}

async function backup(cfg, google, { force }) {
  const now = new Date();
  const fingerprint = await computeFingerprint(cfg);
  const state = await readState(cfg.BACKUP_STATE_DIR);
  const reason = force ? 'manual' : backupReason({ now, state, fingerprint });
  if (!reason) {
    log(`skip: no changes since ${state.lastBackupAt}`);
    return;
  }

  const workDir = path.join(cfg.BACKUP_STATE_DIR, 'work');
  await mkdir(workDir, { recursive:true, mode:0o700 });
  const name = `${BACKUP_FILE_PREFIX}${now.toISOString().replace(/[:.]/g, '').replace(/\d{3}Z$/, 'Z')}.archive.gz.enc`;
  const archivePath = path.join(workDir, name.replace(/\.enc$/, ''));
  const encryptedPath = path.join(workDir, name);
  try {
    await dumpDatabase({
      mongodumpPath:cfg.MONGODUMP_PATH, uri:cfg.mongoUri, dbName:cfg.MONGODB_DB_NAME, archivePath, configPath:path.join(workDir, 'mongodump.yaml')
    });
    await encryptFile(archivePath, encryptedPath, cfg.BACKUP_ENCRYPTION_PASSPHRASE);
    await rm(archivePath, { force:true });
    const { size } = await stat(encryptedPath);

    const folderId = await google.findOrCreateFolder(cfg.BACKUP_DRIVE_FOLDER);
    const uploaded = await google.uploadFile({
      filePath:encryptedPath, name, folderId, description:`Database ${cfg.MONGODB_DB_NAME} from ${os.hostname()} (reason: ${reason})`
    });
    await writeState(cfg.BACKUP_STATE_DIR, { fingerprint, lastBackupAt:now.toISOString(), lastFileName:name, lastFileId:uploaded.id, lastSize:size });
    log(`uploaded ${name} (${megabytes(size)}, reason: ${reason})`);

    const expired = selectExpired(await google.listBackups(folderId), now);
    for (const file of expired) await google.trashFile(file.id);
    if (expired.length) log(`retention: moved ${expired.length} old backup(s) to Drive trash`);

    const quota = await google.storageQuota();
    if (quota.free < cfg.BACKUP_LOW_SPACE_BYTES) {
      log(`warning: only ${megabytes(quota.free)} free on ${quota.account}`);
      await google.sendEmail({
        to:cfg.BACKUP_ALERT_EMAIL,
        subject:'Website backup: Google Drive almost full',
        text:`The backup Google account ${quota.account} has only ${megabytes(quota.free)} free.\nBackups will start failing once it is full. Free up space in Drive, Gmail or Photos for that account.`
      });
    }
  } finally {
    await rm(archivePath, { force:true });
    await rm(encryptedPath, { force:true });
  }
}

let cfg;
let google;
try {
  cfg = loadBackupConfig();
  google = createGoogleClient({ clientId:cfg.GOOGLE_CLIENT_ID, clientSecret:cfg.GOOGLE_CLIENT_SECRET, refreshToken:cfg.GOOGLE_REFRESH_TOKEN });
  await backup(cfg, google, { force:process.argv.includes('--force') });
} catch (error) {
  log(`FAILED: ${error.message}`);
  if (google) {
    try {
      await google.sendEmail({
        to:cfg.BACKUP_ALERT_EMAIL,
        subject:'Website backup FAILED',
        text:`The website database backup on ${os.hostname()} failed at ${new Date().toISOString()}.\n\nError:\n${error.message}\n\nThe previous backups in Google Drive are untouched. Run "npm run backup:check" on the server to diagnose.`
      });
    } catch (alertError) {
      log(`could not send alert email: ${alertError.message}`);
    }
  }
  process.exitCode = 1;
}
