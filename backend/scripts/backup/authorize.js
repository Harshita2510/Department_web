// One-time setup: signs in to the college backup Google account and prints the refresh token for backup.env.
// Run on any computer with a browser; the token can then be copied to the server.
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { loadBackupConfig } from './config.js';
import { GOOGLE_SCOPES } from './google.js';

const cfg = loadBackupConfig({ require:['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] });
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const stateToken = randomBytes(16).toString('hex');

const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const redirectUri = `http://127.0.0.1:${server.address().port}`;

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id:cfg.GOOGLE_CLIENT_ID, redirect_uri:redirectUri, response_type:'code', scope:GOOGLE_SCOPES.join(' '),
  access_type:'offline', prompt:'consent', code_challenge:challenge, code_challenge_method:'S256', state:stateToken
})}`;
console.log('Open this link in a browser and sign in with the college backup Google account:\n');
console.log(`${authUrl}\n`);
console.log('Waiting for Google to redirect back...');

const code = await new Promise((resolve, reject) => {
  server.on('request', (request, response) => {
    const params = new URL(request.url, redirectUri).searchParams;
    if (!params.has('code') && !params.has('error')) {
      response.writeHead(404).end();
      return;
    }
    const ok = params.get('state') === stateToken && params.has('code');
    response.writeHead(200, { 'Content-Type':'text/plain; charset=utf-8' }).end(ok ? 'Authorized. You can close this tab and return to the terminal.' : 'Authorization failed. Check the terminal.');
    if (ok) resolve(params.get('code'));
    else reject(new Error(params.get('error') || 'state mismatch'));
  });
}).finally(() => server.close());

const response = await fetch('https://oauth2.googleapis.com/token', {
  method:'POST',
  body:new URLSearchParams({
    client_id:cfg.GOOGLE_CLIENT_ID, client_secret:cfg.GOOGLE_CLIENT_SECRET, code, code_verifier:verifier, redirect_uri:redirectUri, grant_type:'authorization_code'
  })
});
const tokens = await response.json();
if (!response.ok) throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);
if (!tokens.refresh_token) throw new Error('Google returned no refresh token. Remove the app at myaccount.google.com/permissions and run this again.');

const granted = tokens.scope.split(' ');
const missing = GOOGLE_SCOPES.filter(scope => !granted.includes(scope));
if (missing.length) console.warn(`\nWarning: these permissions were not granted: ${missing.join(', ')}. Tick every checkbox on the consent screen.`);
console.log('\nAdd this line to backup.env on the server:\n');
console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
