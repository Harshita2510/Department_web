import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, rename, rm, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

// File layout: MAGIC | salt | iv | AES-256-GCM ciphertext | auth tag
const MAGIC = Buffer.from('SGSBAK01');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + SALT_BYTES + IV_BYTES;
const SCRYPT_OPTIONS = { N:2 ** 15, r:8, p:1, maxmem:64 * 1024 * 1024 };

const deriveKey = (passphrase, salt) => promisify(scrypt)(passphrase, salt, 32, SCRYPT_OPTIONS);

export async function encryptFile(inputPath, outputPath, passphrase) {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const header = Buffer.concat([MAGIC, salt, iv]);
  const cipher = createCipheriv('aes-256-gcm', await deriveKey(passphrase, salt), iv);
  cipher.setAAD(header);
  const output = createWriteStream(outputPath, { mode:0o600 });
  output.write(header);
  await pipeline(createReadStream(inputPath), cipher, output, { end:false });
  await new Promise((resolve, reject) => output.end(cipher.getAuthTag(), error => (error ? reject(error) : resolve())));
}

export async function decryptFile(inputPath, outputPath, passphrase) {
  const { size } = await stat(inputPath);
  if (size < HEADER_BYTES + TAG_BYTES) throw new Error('File is too small to be a backup archive');
  const handle = await open(inputPath, 'r');
  const header = Buffer.alloc(HEADER_BYTES);
  const tag = Buffer.alloc(TAG_BYTES);
  try {
    await handle.read(header, 0, HEADER_BYTES, 0);
    await handle.read(tag, 0, TAG_BYTES, size - TAG_BYTES);
  } finally {
    await handle.close();
  }
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not a website backup archive');
  const salt = header.subarray(MAGIC.length, MAGIC.length + SALT_BYTES);
  const iv = header.subarray(MAGIC.length + SALT_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', await deriveKey(passphrase, salt), iv);
  decipher.setAAD(header);
  decipher.setAuthTag(tag);
  // Write to a temp name so a wrong passphrase or tampered file never leaves a usable-looking output.
  const partialPath = `${outputPath}.partial`;
  try {
    await pipeline(createReadStream(inputPath, { start:HEADER_BYTES, end:size - TAG_BYTES - 1 }), decipher, createWriteStream(partialPath, { mode:0o600 }));
  } catch (error) {
    await rm(partialPath, { force:true });
    if (/unable to authenticate|auth/i.test(error.message)) throw new Error('Decryption failed: wrong passphrase or the file is corrupted');
    throw error;
  }
  await rename(partialPath, outputPath);
}
