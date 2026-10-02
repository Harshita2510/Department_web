import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The website .env supplies MONGODB_URI/MONGODB_DB_NAME; backup.env holds the backup-only secrets and wins on conflicts.
config({ path:path.join(backendDir, '../.env'), quiet:true });
config({ path:process.env.BACKUP_ENV_FILE || path.join(backendDir, 'backup.env'), override:true, quiet:true });

const schema = z.object({
  MONGODB_URI: z.string().min(1),
  BACKUP_MONGODB_URI: z.string().min(1).optional(),
  MONGODB_DB_NAME: z.string().trim().min(1).default('sgsits_website'),
  MONGODUMP_PATH: z.string().trim().min(1).default('mongodump'),
  GOOGLE_CLIENT_ID: z.string().trim().min(1),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1),
  GOOGLE_REFRESH_TOKEN: z.string().trim().min(1),
  BACKUP_DRIVE_FOLDER: z.string().trim().min(1).default('Website Backups'),
  BACKUP_ENCRYPTION_PASSPHRASE: z.string().min(20, 'Use a passphrase of at least 20 characters'),
  BACKUP_ALERT_EMAIL: z.string().email(),
  BACKUP_STATE_DIR: z.string().trim().min(1).default(path.join(backendDir, '.backup')),
  BACKUP_LOW_SPACE_BYTES: z.coerce.number().int().positive().default(1024 ** 3)
});

export function loadBackupConfig({ require = Object.keys(schema.shape) } = {}) {
  const parsed = schema.pick(Object.fromEntries(require.map(key => [key, true]))).safeParse(process.env);
  if (!parsed.success) {
    const error = new Error(`Invalid backup configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
    error.configError = true;
    throw error;
  }
  const values = parsed.data;
  return { ...values, mongoUri:values.BACKUP_MONGODB_URI || values.MONGODB_URI };
}
