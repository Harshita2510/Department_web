# Database Backups

The website's MongoDB database (every collection, including PDFs stored in GridFS) is backed up to a
Google Drive owned by the college. Files hosted on Cloudinary are **not** included; only their records are.
Cloudinary files are protected by Cloudinary's own backup instead; see [Cloudinary files](#cloudinary-files).

## How it works

A cron job on the college server runs `npm run backup` every night at 02:00:

1. It computes a fingerprint of the database (document count, newest `_id` and latest `updatedAt` per
   collection). `auditlogs` is left out of the fingerprint so routine admin activity doesn't trigger a backup,
   but it is still included in every dump.
2. It uploads a backup only if one of these is true:
   - the fingerprint changed since the last backup
   - it's Sunday
   - the last backup is more than 7 days old (catches a missed Sunday)

   Otherwise it logs `skip` and exits within seconds.
3. Backup steps: `mongodump --archive --gzip` → AES-256-GCM encryption with the college's passphrase →
   upload to the `Website Backups` folder in Drive.
4. Retention: it keeps the 10 newest backups plus the newest backup from each of the last 6 calendar months.
   Older ones go to the Drive trash, where Drive deletes them permanently after 30 days.
5. If anything fails, or Drive has less than 1 GB free, an email goes to `BACKUP_ALERT_EMAIL`.

Each backup file is named like `sgsits-backup-2026-10-04T020001Z.archive.gz.enc`.

## One-time setup

### 1. College Google account
- Create a dedicated Gmail account for backups. Set its recovery email, recovery phone and 2-step
  verification to college staff, and store the backup codes with the college.

### 2. Google Cloud OAuth client (signed in as the backup account)
1. Open <https://console.cloud.google.com/>, create a project such as "Website Backup", and enable the
   **Google Drive API** and **Gmail API**.
2. **OAuth consent screen**: set user type to *External*, add the scopes `drive.file` and `gmail.send`, then
   click **Publish app** so the status is *In production*.
   > Apps left in *Testing* get refresh tokens that expire after 7 days, and backups would stop silently.
   > The app doesn't need Google verification: the "unverified app" warning only appears to the account
   > owner during step 4.
3. **Credentials → Create credentials → OAuth client ID → Desktop app**. Copy the client ID and secret.

### 3. Server prerequisites
- Node.js 20.18 or later, plus the backend's `npm install`.
- **MongoDB Database Tools** (provides `mongodump` and `mongorestore`):
  <https://www.mongodb.com/try/download/database-tools>. Check with `mongodump --version`.
- **Atlas → Network Access**: add the college server's public IP. The website needs this too.
- Recommended: in **Atlas → Database Access**, create a separate user with the specific privilege `read@sgsits_website` and set
  `BACKUP_MONGODB_URI` to it. The backup then cannot modify data even if `backup.env` leaks.

### 4. Configure `backup.env`
```bash
cd backend
cp backup.env.example backup.env
chmod 600 backup.env
# fill GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BACKUP_ENCRYPTION_PASSPHRASE, BACKUP_ALERT_EMAIL
npm run backup:auth        # opens a Google sign-in link; sign in as the backup account
# paste the printed GOOGLE_REFRESH_TOKEN line into backup.env
```
`backup:auth` needs a browser, so you can run it on a laptop and copy the token to the server.

**The encryption passphrase cannot be recovered.** Give a written copy to the college and store it separately
from the Gmail credentials.

### 5. Preflight and first backup
```bash
node scripts/backup/check.js --send-test-alert
npm run backup:now
```
`backup:check` verifies the configuration, `mongodump`, the MongoDB connection, encryption, Google sign-in,
Drive space and the folder, and emails a test alert. Fix anything marked ✖ before continuing.

### 6. Cron
Run `crontab -e` as the user that owns the website files, and add:
```cron
0 2 * * * cd /path/to/Department_web/backend && flock -n .backup/run.lock npm run backup >> .backup/backup.log 2>&1
```
`flock` stops two runs from overlapping. If the college requires an outbound proxy, put it at the start of
the command (needs Node 22.21+ or 24.5+):
```cron
0 2 * * * cd /path/to/Department_web/backend && NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://proxy:3128 flock -n .backup/run.lock npm run backup >> .backup/backup.log 2>&1
```
The firewall must allow outbound HTTPS to `oauth2.googleapis.com`, `www.googleapis.com` and
`gmail.googleapis.com`, plus Atlas on port 27017.

## Restoring

1. Download the backup you want from the `Website Backups` folder in Google Drive.
2. Decrypt it on any machine with this repository and Node.js. It asks for the passphrase unless
   `BACKUP_ENCRYPTION_PASSPHRASE` is set:
   ```bash
   cd backend
   npm run backup:decrypt -- ~/Downloads/sgsits-backup-2026-10-04T020001Z.archive.gz.enc
   ```
3. **Test restore** into a separate database first. This leaves the live data untouched:
   ```bash
   mongorestore --uri="mongodb+srv://USER:PASS@cluster.example.mongodb.net/" \
     --archive=sgsits-backup-2026-10-04T020001Z.archive.gz --gzip \
     --nsFrom='sgsits_website.*' --nsTo='sgsits_restore_test.*'
   ```
   Check the collection counts in Atlas against `npm run backup:check`, then drop `sgsits_restore_test`.
4. **Real restore**: this replaces the live collections with the backup's contents. Stop the website first:
   ```bash
   mongorestore --uri="mongodb+srv://USER:PASS@cluster.example.mongodb.net/" \
     --archive=sgsits-backup-2026-10-04T020001Z.archive.gz --gzip \
     --nsInclude='sgsits_website.*' --drop
   ```
   Restoring requires a user with write access, not the read-only backup user.

Do a test restore once after setup, and again whenever the schema changes significantly.

## Cloudinary files

Syllabus, timetable and placement PDFs, event images and faculty photos are stored on Cloudinary under
`sgsits/`. They are protected by **Cloudinary's built-in backup** (Console → Settings → Backup), which keeps
earlier versions of every asset, including assets the website deletes when a file is replaced or removed.

- **Restore a deleted or replaced file:** Media Library → open the asset (use the filter for deleted assets if it
  no longer appears) → backed-up versions → **Restore**. It returns under the same public ID, so the link stored in
  the database works again.
- **What it does not cover:** the backups live inside the same Cloudinary account. If the account is lost,
  suspended or locked, the files are gone. The college must own the account and keep 2-step verification and
  recovery details current.
- Backup storage may count toward the plan's monthly credits; check usage under Console → Usage now and then.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Alert says `invalid_grant` | The refresh token was revoked or the app is still in *Testing*. Publish the app and run `npm run backup:auth` again. |
| `mongodump not found` | Install MongoDB Database Tools, or set `MONGODUMP_PATH` to its full path. |
| MongoDB times out | Add the server IP to Atlas Network Access, or check the firewall allows port 27017. |
| Google requests time out | Firewall or proxy. See the proxy cron line above. |
| Need a backup right now (e.g. before a big edit) | `npm run backup:now` |
