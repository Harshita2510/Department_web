// Decrypts a backup downloaded from Google Drive so it can be restored with mongorestore.
//   node scripts/backup/decrypt.js <backup.archive.gz.enc> [output.archive.gz]
// The passphrase is read from BACKUP_ENCRYPTION_PASSPHRASE (env or backup.env), or asked for interactively.
import { createInterface } from 'node:readline/promises';
import { decryptFile } from './encryption.js';
import './config.js';

const [input, output = input?.replace(/\.enc$/, '')] = process.argv.slice(2);
if (!input || !input.endsWith('.enc')) {
  console.error('Usage: node scripts/backup/decrypt.js <backup.archive.gz.enc> [output.archive.gz]');
  process.exit(1);
}

let passphrase = process.env.BACKUP_ENCRYPTION_PASSPHRASE;
if (!passphrase) {
  const prompt = createInterface({ input:process.stdin, output:process.stdout });
  passphrase = await prompt.question('Backup encryption passphrase: ');
  prompt.close();
}

try {
  await decryptFile(input, output, passphrase);
  console.log(`Decrypted to ${output}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
