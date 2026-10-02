import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const stateFile = dir => path.join(dir, 'state.json');

export async function readState(dir) {
  try {
    return JSON.parse(await readFile(stateFile(dir), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeState(dir, state) {
  await mkdir(dir, { recursive:true, mode:0o700 });
  const temp = `${stateFile(dir)}.tmp`;
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { mode:0o600 });
  await rename(temp, stateFile(dir));
}
