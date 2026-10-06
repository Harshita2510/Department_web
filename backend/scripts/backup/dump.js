import { spawn } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio:['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', error => reject(error.code === 'ENOENT' ? new Error(`"${command}" not found. Install MongoDB Database Tools or set MONGODUMP_PATH.`) : error));
    child.on('close', code => (code === 0 ? resolve(output) : reject(new Error(`${command} exited with code ${code}: ${output.trim().split('\n').slice(-5).join(' | ')}`))));
  });
}

// mongodump refuses --db when the URI names a different database, so drop any database path from the URI.
export const stripDatabaseFromUri = uri => uri.replace(/^(mongodb(?:\+srv)?:\/\/[^/?]+)\/[^?]*/, '$1/');

export async function mongodumpVersion(mongodumpPath) {
  return (await runProcess(mongodumpPath, ['--version'])).split('\n')[0].trim();
}

export async function dumpDatabase({ mongodumpPath, uri, dbName, archivePath, configPath }) {
  // The URI carries the database password; passing it through a 0600 config file keeps it out of `ps` output.
  await writeFile(configPath, `uri: ${JSON.stringify(stripDatabaseFromUri(uri))}\n`, { mode:0o600 });
  try {
    await runProcess(mongodumpPath, [`--config=${configPath}`, `--db=${dbName}`, `--archive=${archivePath}`, '--gzip', '--quiet']);
  } finally {
    await rm(configPath, { force:true });
  }
}
