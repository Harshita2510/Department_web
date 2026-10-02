import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { stripDatabaseFromUri } from '../scripts/backup/dump.js';
import { decryptFile, encryptFile } from '../scripts/backup/encryption.js';
import { backupReason, fingerprintFromStats } from '../scripts/backup/fingerprint.js';
import { selectExpired } from '../scripts/backup/retention.js';

const wednesday = new Date(2026, 9, 7, 2, 0);
const sunday = new Date(2026, 9, 4, 2, 0);

test('first run always backs up', () => {
  assert.equal(backupReason({ now:wednesday, state:null, fingerprint:'a' }), 'first-backup');
});

test('skips a weekday night when nothing changed', () => {
  const state = { fingerprint:'a', lastBackupAt:new Date(2026, 9, 6, 2, 0).toISOString() };
  assert.equal(backupReason({ now:wednesday, state, fingerprint:'a' }), null);
});

test('backs up when the data changed', () => {
  const state = { fingerprint:'a', lastBackupAt:new Date(2026, 9, 6, 2, 0).toISOString() };
  assert.equal(backupReason({ now:wednesday, state, fingerprint:'b' }), 'data-changed');
});

test('forces a backup on Sunday, but only once that day', () => {
  const state = { fingerprint:'a', lastBackupAt:new Date(2026, 9, 1, 2, 0).toISOString() };
  assert.equal(backupReason({ now:sunday, state, fingerprint:'a' }), 'weekly');
  const alreadyDone = { fingerprint:'a', lastBackupAt:new Date(2026, 9, 4, 1, 0).toISOString() };
  assert.equal(backupReason({ now:sunday, state:alreadyDone, fingerprint:'a' }), null);
});

test('catches up when the Sunday run was missed', () => {
  const state = { fingerprint:'a', lastBackupAt:new Date(2026, 8, 30, 2, 0).toISOString() };
  assert.equal(backupReason({ now:wednesday, state, fingerprint:'a' }), 'overdue');
});

test('fingerprint ignores collection order but detects edits', () => {
  const users = { name:'users', count:3, newestId:'x', latestUpdate:'2026-10-01T00:00:00.000Z' };
  const contents = { name:'contents', count:9, newestId:'y', latestUpdate:'2026-10-02T00:00:00.000Z' };
  assert.equal(fingerprintFromStats([users, contents]), fingerprintFromStats([contents, users]));
  assert.notEqual(fingerprintFromStats([users, contents]), fingerprintFromStats([users, { ...contents, latestUpdate:'2026-10-03T00:00:00.000Z' }]));
  assert.notEqual(fingerprintFromStats([users, contents]), fingerprintFromStats([users, { ...contents, count:8 }]));
});

test('retention keeps the 10 newest plus the newest of each of the last 6 months', () => {
  const now = new Date(2026, 9, 31);
  const files = [];
  // Three backups a week for ten months.
  for (let day = 0; day < 300; day += 2) {
    const created = new Date(now - day * 86_400_000);
    files.push({ id:`f${day}`, createdTime:created.toISOString() });
  }
  const expired = new Set(selectExpired(files, now).map(file => file.id));
  const kept = files.filter(file => !expired.has(file.id));

  for (const file of files.slice(0, 10)) assert.ok(!expired.has(file.id), 'recent backups are kept');
  const keptMonths = new Set(kept.map(file => (d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)(new Date(file.createdTime))));
  for (const month of ['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05']) assert.ok(keptMonths.has(month), `keeps ${month}`);
  assert.ok(!keptMonths.has('2026-04'), 'drops months older than six');
  assert.ok(kept.length <= 10 + 6);
});

test('retention removes nothing while there are few backups', () => {
  const files = [{ id:'a', createdTime:'2026-10-01T02:00:00Z' }, { id:'b', createdTime:'2026-03-01T02:00:00Z' }];
  assert.deepEqual(selectExpired(files.slice(0, 1), new Date(2026, 9, 2)), []);
  assert.deepEqual(selectExpired(files, new Date(2026, 9, 2)), []);
});

test('mongodump URI loses its database path but keeps options', () => {
  assert.equal(stripDatabaseFromUri('mongodb+srv://u:p@cluster.mongodb.net/sgsits?retryWrites=true'), 'mongodb+srv://u:p@cluster.mongodb.net/?retryWrites=true');
  assert.equal(stripDatabaseFromUri('mongodb://u:p@a:27017,b:27017/sgsits'), 'mongodb://u:p@a:27017,b:27017/');
  assert.equal(stripDatabaseFromUri('mongodb+srv://u:p@cluster.mongodb.net'), 'mongodb+srv://u:p@cluster.mongodb.net');
});

test('encryption round-trips and rejects a wrong passphrase or tampering', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'backup-test-'));
  try {
    const plain = path.join(dir, 'dump.archive.gz');
    const sealed = path.join(dir, 'dump.archive.gz.enc');
    const opened = path.join(dir, 'restored.archive.gz');
    const data = Buffer.alloc(300_000, 'website data ');
    await writeFile(plain, data);
    await encryptFile(plain, sealed, 'correct horse battery staple');
    assert.ok(!(await readFile(sealed)).includes(Buffer.from('website data')));

    await decryptFile(sealed, opened, 'correct horse battery staple');
    assert.ok((await readFile(opened)).equals(data));

    await assert.rejects(decryptFile(sealed, path.join(dir, 'wrong.out'), 'wrong passphrase entirely'), /wrong passphrase or the file is corrupted/);
    await assert.rejects(readFile(path.join(dir, 'wrong.out.partial')), { code:'ENOENT' });

    const tampered = await readFile(sealed);
    tampered[1000] ^= 1;
    await writeFile(sealed, tampered);
    await assert.rejects(decryptFile(sealed, path.join(dir, 'tampered.out'), 'correct horse battery staple'), /wrong passphrase or the file is corrupted/);
  } finally {
    await rm(dir, { recursive:true, force:true });
  }
});
