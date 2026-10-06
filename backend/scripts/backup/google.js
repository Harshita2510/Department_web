import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/gmail.send'];
export const BACKUP_FILE_PREFIX = 'sgsits-backup-';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const DRIVE = 'https://www.googleapis.com/drive/v3';

async function expectOk(response, action) {
  if (response.ok) return response;
  const body = await response.text().catch(() => '');
  throw new Error(`${action} failed (${response.status}): ${body.slice(0, 500)}`);
}

const quote = value => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export function createGoogleClient({ clientId, clientSecret, refreshToken }) {
  let cached = null;

  async function accessToken() {
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method:'POST',
      body:new URLSearchParams({ client_id:clientId, client_secret:clientSecret, refresh_token:refreshToken, grant_type:'refresh_token' })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const hint = body.includes('invalid_grant') ? ' The refresh token was revoked or expired; run "npm run backup:auth" again.' : '';
      throw new Error(`Google sign-in failed (${response.status}): ${body.slice(0, 300)}.${hint}`);
    }
    const data = await response.json();
    cached = { token:data.access_token, expiresAt:Date.now() + data.expires_in * 1000 };
    return cached.token;
  }

  async function call(url, options = {}, action = 'Google API call') {
    const headers = { Authorization:`Bearer ${await accessToken()}`, ...options.headers };
    return expectOk(await fetch(url, { ...options, headers }), action);
  }

  async function findOrCreateFolder(name) {
    const q = `mimeType=${quote(FOLDER_MIME)} and name=${quote(name)} and trashed=false`;
    const found = await (await call(`${DRIVE}/files?${new URLSearchParams({ q, fields:'files(id)' })}`, {}, 'Finding backup folder')).json();
    if (found.files.length) return found.files[0].id;
    const created = await call(`${DRIVE}/files?fields=id`, {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ name, mimeType:FOLDER_MIME })
    }, 'Creating backup folder');
    return (await created.json()).id;
  }

  async function uploadFile({ filePath, name, folderId, description }) {
    const { size } = await stat(filePath);
    const session = await call('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size', {
      method:'POST',
      headers:{ 'Content-Type':'application/json; charset=UTF-8', 'X-Upload-Content-Type':'application/octet-stream', 'X-Upload-Content-Length':String(size) },
      body:JSON.stringify({ name, parents:[folderId], description })
    }, 'Starting upload');
    const uploadUrl = session.headers.get('location');
    const response = await call(uploadUrl, {
      method:'PUT', headers:{ 'Content-Length':String(size) }, body:createReadStream(filePath), duplex:'half'
    }, 'Uploading backup');
    const file = await response.json();
    if (Number(file.size) !== size) throw new Error(`Upload size mismatch: sent ${size} bytes, Drive stored ${file.size}`);
    return file;
  }

  async function listBackups(folderId) {
    const files = [];
    let pageToken;
    do {
      const params = new URLSearchParams({
        q:`${quote(folderId)} in parents and trashed=false`, fields:'nextPageToken,files(id,name,size,createdTime)', pageSize:'1000', orderBy:'createdTime desc'
      });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await (await call(`${DRIVE}/files?${params}`, {}, 'Listing backups')).json();
      files.push(...page.files.filter(file => file.name.startsWith(BACKUP_FILE_PREFIX)));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return files;
  }

  // Trashed rather than deleted: Drive empties the trash after 30 days, which gives a window to undo a mistake.
  async function trashFile(id) {
    await call(`${DRIVE}/files/${id}`, {
      method:'PATCH', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ trashed:true })
    }, 'Trashing old backup');
  }

  async function storageQuota() {
    const { storageQuota:quota, user } = await (await call(`${DRIVE}/about?fields=storageQuota,user(emailAddress)`, {}, 'Reading storage quota')).json();
    const limit = quota.limit ? Number(quota.limit) : null;
    return { account:user.emailAddress, limit, usage:Number(quota.usage), free:limit === null ? Infinity : limit - Number(quota.usage) };
  }

  async function sendEmail({ to, subject, text }) {
    const mime = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(text).toString('base64')
    ].join('\r\n');
    await call('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ raw:Buffer.from(mime).toString('base64url') })
    }, 'Sending alert email');
  }

  return { accessToken, findOrCreateFolder, uploadFile, listBackups, trashFile, storageQuota, sendEmail };
}
